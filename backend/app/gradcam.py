import base64
import io
import cv2
import numpy as np
import torch
from PIL import Image

def normalize_cam(cam, percentile_lower=1, percentile_upper=99, eps=1e-8):
    cam = np.maximum(cam, 0)
    if cam.max() < eps:
        return cam
    
    p_low = np.percentile(cam, percentile_lower)
    p_high = np.percentile(cam, percentile_upper)
    
    cam = np.clip(cam, p_low, p_high)
    cam = (cam - p_low) / (p_high - p_low + eps)
    return cam

def overlay_cam(img_tensor, cam, alpha=0.5, colormap=cv2.COLORMAP_JET):
    # Convert input tensor (1, C, H, W) in [-1, 1] back to [0, 255] uint8 image
    img_np = img_tensor[0, 0].cpu().numpy()
    img_np = (img_np * 0.5 + 0.5) * 255.0
    img_np = np.clip(img_np, 0, 255).astype(np.uint8)
    
    # Convert grayscale back to RGB for blending
    img_rgb = cv2.cvtColor(img_np, cv2.COLOR_GRAY2RGB)
    
    # Apply colormap to CAM
    heatmap = cv2.applyColorMap(np.uint8(255 * cam), colormap)
    heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
    
    blended = cv2.addWeighted(
        heatmap, alpha,
        img_rgb, 1.0 - alpha,
        0
    )
    return blended

def to_base64_image(img_array):
    img = Image.fromarray(img_array)
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG")
    return "data:image/jpeg;base64," + base64.b64encode(buffer.getvalue()).decode("utf-8")

class GradCAM:
    def __init__(self, model, target_layer):
        self.model = model
        self.target_layer = target_layer
        self.feature_maps = None
        self.gradients = None
        
        self._fwd_hook = target_layer.register_forward_hook(self._save_features)
        self._bwd_hook = target_layer.register_full_backward_hook(self._save_gradients)
    
    def _save_features(self, module, input, output):
        self.feature_maps = output.detach()
    
    def _save_gradients(self, module, grad_input, grad_output):
        if grad_output and len(grad_output) > 0 and grad_output[0] is not None:
            self.gradients = grad_output[0].detach()
    
    def __call__(self, x, class_idx=None):
        self.model.eval()
        self.model.zero_grad()
        
        x_var = x.clone().requires_grad_(True)
        output = self.model(x_var)
        probs = torch.softmax(output, dim=1)[0].detach().cpu().numpy()
        
        if class_idx is None:
            class_idx = int(torch.argmax(output, dim=1).item())
        
        score = output[0, class_idx]
        score.backward()
        
        if self.gradients is None or self.feature_maps is None:
            cam = np.zeros((x.shape[2], x.shape[3]), dtype=np.float32)
            return cam, class_idx, probs
            
        gradients = self.gradients[0].cpu().numpy()
        feature_maps = self.feature_maps[0].cpu().numpy()
        
        weights = np.mean(gradients, axis=(1, 2))
        
        cam = np.zeros(feature_maps.shape[1:], dtype=np.float32)
        for i, w in enumerate(weights):
            cam += w * feature_maps[i]
        
        cam = cv2.resize(cam, (x.shape[3], x.shape[2]))
        cam = normalize_cam(cam)
        
        return cam, class_idx, probs
    
    def remove_hooks(self):
        self._fwd_hook.remove()
        self._bwd_hook.remove()
