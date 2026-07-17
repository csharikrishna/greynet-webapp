import torch
import torch.nn as nn
import torch.nn.functional as F

class FocalLoss(nn.Module):
    """
    Focal Loss for addressing class imbalance and focusing on hard examples.
    FL(p_t) = -alpha * (1 - p_t)^gamma * log(p_t)
    
    This implementation incorporates optional label smoothing and class weights.
    """
    def __init__(self, weight=None, gamma=2.0, reduction='mean', label_smoothing=0.0):
        super().__init__()
        self.weight = weight  # class weights
        self.gamma = gamma
        self.reduction = reduction
        self.label_smoothing = label_smoothing

    def forward(self, inputs, targets):
        # inputs: (B, C) logits
        # targets: (B,) integer labels
        
        # Compute standard cross entropy loss with weights and smoothing
        ce_loss = F.cross_entropy(
            inputs, targets, 
            reduction='none', 
            weight=self.weight, 
            label_smoothing=self.label_smoothing
        )
        
        # Calculate true class probabilities (pt) for scaling
        # pt = exp(-CE_loss_without_smoothing_and_weights)
        # Or simpler: just gather the probabilities
        probs = F.softmax(inputs, dim=1)
        pt = probs.gather(1, targets.unsqueeze(1)).squeeze(1)
        
        # Apply focal scaling factor: (1 - pt)^gamma
        focal_loss = ((1 - pt) ** self.gamma) * ce_loss
        
        if self.reduction == 'mean':
            return focal_loss.mean()
        elif self.reduction == 'sum':
            return focal_loss.sum()
        else:
            return focal_loss
