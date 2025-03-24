import { Request, Response } from 'express';
import Deployment from '../models/Deployment';
import Device from '../models/Device';
import Payload from '../models/Payload';
import { AuthRequest } from '../middleware/authMiddleware';
import User from '../models/User';

// Get all deployments
export const getAllDeployments = async (req: Request, res: Response): Promise<void> => {
  try {
    const deployments = await Deployment.findAll({
      include: [
        { model: Payload, as: 'payload' },
        { model: Device, as: 'device' },
        { model: User, as: 'initiator' }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      success: true,
      data: deployments
    });
  } catch (error) {
    console.error('Error fetching all deployments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deployments'
    });
  }
};

// Get a single deployment
export const getDeployment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const deployment = await Deployment.findByPk(id, {
      include: [
        { model: Payload, as: 'payload' },
        { model: Device, as: 'device' },
        { model: User, as: 'initiator' }
      ]
    });
    
    if (!deployment) {
      res.status(404).json({
        success: false,
        message: 'Deployment not found'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: deployment
    });
  } catch (error) {
    console.error('Error fetching deployment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deployment'
    });
  }
};

// Get deployments for a specific device
export const getDeviceDeployments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { deviceId } = req.params;
    
    // First check if the device exists
    const device = await Device.findByPk(deviceId);
    
    if (!device) {
      res.status(404).json({
        success: false,
        message: 'Device not found'
      });
      return;
    }
    
    const deployments = await Deployment.findAll({
      where: { deviceId },
      include: [
        { model: Payload, as: 'payload' },
        { model: Device, as: 'device' },
        { model: User, as: 'initiator' }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      success: true,
      data: deployments
    });
  } catch (error) {
    console.error('Error fetching device deployments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch device deployments'
    });
  }
};

// Get deployments for a specific payload
export const getPayloadDeployments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { payloadId } = req.params;
    
    // First check if the payload exists
    const payload = await Payload.findByPk(payloadId);
    
    if (!payload) {
      res.status(404).json({
        success: false,
        message: 'Payload not found'
      });
      return;
    }
    
    const deployments = await Deployment.findAll({
      where: { payloadId },
      include: [
        { model: Payload, as: 'payload' },
        { model: Device, as: 'device' },
        { model: User, as: 'initiator' }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      success: true,
      data: deployments
    });
  } catch (error) {
    console.error('Error fetching payload deployments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payload deployments'
    });
  }
};

// Get user's deployments
export const getUserDeployments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User ID not found in authentication token'
      });
      return;
    }
    
    const deployments = await Deployment.findAll({
      where: { userId },
      include: [
        { model: Payload, as: 'payload' },
        { model: Device, as: 'device' },
        { model: User, as: 'initiator' }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      success: true,
      data: deployments
    });
  } catch (error) {
    console.error('Error fetching user deployments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user deployments'
    });
  }
}; 