import { Request, Response } from 'express';
import Payload from '../models/Payload';
import Device from '../models/Device';
import Deployment from '../models/Deployment';
import { AuthRequest } from '../middleware/authMiddleware';
import axios from 'axios';

// Get all payloads
export const getAllPayloads = async (req: Request, res: Response) => {
  try {
    const payloads = await Payload.findAll({
      include: [{ association: 'creator', attributes: ['id', 'username', 'email'] }]
    });
    
    return res.status(200).json({
      success: true,
      data: payloads,
    });
  } catch (error) {
    console.error('Error fetching payloads:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payloads',
    });
  }
};

// Get a single payload
export const getPayload = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payload = await Payload.findByPk(id, {
      include: [{ association: 'creator', attributes: ['id', 'username', 'email'] }]
    });
    
    if (!payload) {
      return res.status(404).json({
        success: false,
        message: 'Payload not found',
      });
    }
    
    return res.status(200).json({
      success: true,
      data: payload,
    });
  } catch (error) {
    console.error('Error fetching payload:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payload',
    });
  }
};

// Create a new payload
export const createPayload = async (req: AuthRequest, res: Response) => {
  try {
    const { name, script, description } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
      });
    }
    
    const payload = await Payload.create({
      name,
      script,
      description,
      userId,
    });
    
    return res.status(201).json({
      success: true,
      message: 'Payload created successfully',
      data: payload,
    });
  } catch (error) {
    console.error('Error creating payload:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create payload',
    });
  }
};

// Update an existing payload
export const updatePayload = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, script, description } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
      });
    }
    
    const payload = await Payload.findByPk(id);
    
    if (!payload) {
      return res.status(404).json({
        success: false,
        message: 'Payload not found',
      });
    }
    
    // Check if the user is the creator of the payload
    if (payload.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this payload',
      });
    }
    
    await payload.update({
      name,
      script,
      description,
    });
    
    return res.status(200).json({
      success: true,
      message: 'Payload updated successfully',
      data: payload,
    });
  } catch (error) {
    console.error('Error updating payload:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update payload',
    });
  }
};

// Delete a payload
export const deletePayload = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
      });
    }
    
    const payload = await Payload.findByPk(id);
    
    if (!payload) {
      return res.status(404).json({
        success: false,
        message: 'Payload not found',
      });
    }
    
    // Check if the user is the creator of the payload
    if (payload.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this payload',
      });
    }
    
    await payload.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'Payload deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting payload:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete payload',
    });
  }
};

// Deploy a payload to a device
export const deployPayload = async (req: AuthRequest, res: Response) => {
  try {
    const { payloadId, deviceId } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
      });
    }
    
    // Find the payload
    const payload = await Payload.findByPk(payloadId);
    if (!payload) {
      return res.status(404).json({
        success: false,
        message: 'Payload not found',
      });
    }
    
    // Find the device
    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }
    
    // Check if device is online
    if (device.status !== 'online') {
      return res.status(400).json({
        success: false,
        message: 'Device is offline or busy',
      });
    }
    
    // Create a deployment record
    const deployment = await Deployment.create({
      payloadId,
      deviceId,
      userId,
      status: 'pending',
    });
    
    try {
      // In a real implementation, we would communicate with the actual O.MG Cable
      // For now, simulate a successful deployment
      
      // Update device status to 'busy'
      await device.update({ status: 'busy' });
      
      // Update deployment status to 'executing'
      await deployment.update({ status: 'executing' });
      
      // Notify clients via Socket.IO
      const io = req.app.get('io');
      if (io) {
        io.emit('device_status_changed', {
          id: device.id,
          status: 'busy'
        });
        
        io.emit('deployment_status_changed', {
          id: deployment.id,
          status: 'executing'
        });
      }
      
      // Simulate device execution (would be a real API call in production)
      setTimeout(async () => {
        try {
          // Update deployment status to 'completed'
          await deployment.update({ 
            status: 'completed',
            result: JSON.stringify({
              success: true,
              executionTime: Math.floor(Math.random() * 5000) + 1000,
              output: "Command executed successfully",
              timestamp: new Date()
            })
          });
          
          // Update device status back to 'online'
          await device.update({ status: 'online' });
          
          // Notify clients via Socket.IO
          if (io) {
            io.emit('device_status_changed', {
              id: device.id,
              status: 'online'
            });
            
            io.emit('deployment_status_changed', {
              id: deployment.id,
              status: 'completed'
            });
          }
        } catch (error) {
          console.error('Error updating deployment after completion:', error);
        }
      }, 5000); // Simulate a 5-second execution time
      
      return res.status(200).json({
        success: true,
        message: 'Payload deployment initiated',
        data: deployment,
      });
    } catch (error) {
      // If deployment fails, update the status
      await deployment.update({ status: 'failed' });
      
      return res.status(500).json({
        success: false,
        message: 'Failed to deploy payload to device',
      });
    }
  } catch (error) {
    console.error('Error deploying payload:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to deploy payload',
    });
  }
}; 