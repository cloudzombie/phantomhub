import { Request, Response } from 'express';
import Device from '../models/Device';
import axios from 'axios';

// Get all O.MG Cables
export const getAllDevices = async (req: Request, res: Response) => {
  try {
    const devices = await Device.findAll();
    return res.status(200).json({
      success: true,
      data: devices,
    });
  } catch (error) {
    console.error('Error fetching O.MG Cables:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch O.MG Cables',
    });
  }
};

// Get a single O.MG Cable
export const getDevice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const device = await Device.findByPk(id);
    
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'O.MG Cable not found',
      });
    }
    
    return res.status(200).json({
      success: true,
      data: device,
    });
  } catch (error) {
    console.error('Error fetching O.MG Cable:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch O.MG Cable',
    });
  }
};

// Register a new O.MG Cable
export const createDevice = async (req: Request, res: Response) => {
  try {
    const { name, ipAddress, firmwareVersion, connectionType, serialPortId } = req.body;
    
    // If this is a network device, verify connectivity
    if (connectionType !== 'usb') {
      try {
        // NOTE: In a real implementation, we would use the actual O.MG Cable API endpoints
        await axios.get(`http://${ipAddress}/ping`, { timeout: 5000 });
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: 'Could not connect to the O.MG Cable at the specified IP address',
        });
      }
    }
    
    const device = await Device.create({
      name,
      ipAddress,
      firmwareVersion,
      status: connectionType === 'usb' ? 'online' : 'online', // Mark USB devices as online immediately
      connectionType: connectionType || 'network',
      serialPortId: serialPortId || null,
    });
    
    // Notify all connected clients via Socket.IO about the new device
    const io = req.app.get('io');
    if (io) {
      io.emit('device_added', device);
    }
    
    return res.status(201).json({
      success: true,
      message: 'O.MG Cable registered successfully',
      data: device,
    });
  } catch (error) {
    console.error('Error registering O.MG Cable:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to register O.MG Cable',
    });
  }
};

// Update O.MG Cable status
export const updateDeviceStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const device = await Device.findByPk(id);
    
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'O.MG Cable not found',
      });
    }
    
    // Try to ping the O.MG Cable to verify status
    let actualStatus = status;
    try {
      // NOTE: In a real implementation, we would use the actual O.MG Cable API endpoints
      await axios.get(`http://${device.ipAddress}/ping`, { timeout: 5000 });
      // If the ping was successful but requested status is offline, respect the requested status
      if (status === 'offline') {
        actualStatus = 'offline';
      } else {
        actualStatus = 'online';
      }
    } catch (err) {
      // If we can't reach the device, it's offline regardless of requested status
      actualStatus = 'offline';
    }
    
    // Update device status and check-in time
    device.status = actualStatus;
    device.lastCheckIn = new Date();
    await device.save();
    
    // Notify all connected clients via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('device_status_changed', {
        id: device.id,
        status: device.status
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'O.MG Cable status updated successfully',
      data: device,
    });
  } catch (error) {
    console.error('Error updating O.MG Cable status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update O.MG Cable status',
    });
  }
};

// Send payload to O.MG Cable
export const sendPayload = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { payloadId } = req.body;
    
    const device = await Device.findByPk(id);
    
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'O.MG Cable not found',
      });
    }
    
    if (device.status !== 'online') {
      return res.status(400).json({
        success: false,
        message: 'Cannot send payload to offline O.MG Cable',
      });
    }
    
    // In a real implementation, we would fetch the payload from the database
    // and send it to the O.MG Cable using its API
    
    try {
      // NOTE: This is a placeholder. In a real implementation, we would:
      // 1. Fetch the payload script from the database
      // 2. Send it to the O.MG Cable's API endpoint
      // 3. Handle the response accordingly
      await axios.post(`http://${device.ipAddress}/execute`, {
        payloadId,
      }, { timeout: 10000 });
      
      // Update device status to 'busy' while executing payload
      device.status = 'busy';
      await device.save();
      
      // Notify all connected clients via Socket.IO
      const io = req.app.get('io');
      if (io) {
        io.emit('device_status_changed', {
          id: device.id,
          status: 'busy'
        });
        
        io.emit('payload_executing', {
          deviceId: device.id,
          payloadId
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Payload sent to O.MG Cable successfully',
        data: {
          deviceId: device.id,
          payloadId,
          status: 'executing'
        },
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Failed to communicate with O.MG Cable',
      });
    }
    
  } catch (error) {
    console.error('Error sending payload to O.MG Cable:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send payload to O.MG Cable',
    });
  }
}; 