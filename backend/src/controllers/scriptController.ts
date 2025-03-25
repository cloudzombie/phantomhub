import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Script from '../models/Script';
import User from '../models/User';
import Payload from '../models/Payload';
import PayloadScript from '../models/PayloadScript';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import axios from 'axios';

// Get all scripts
export const getAllScripts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    let scripts;

    // If user has admin role, get all scripts
    if (req.user?.role === 'admin') {
      scripts = await Script.findAll({
        include: [
          { 
            model: User, 
            as: 'creator', 
            attributes: ['id', 'username', 'email'] 
          },
          {
            model: Payload,
            as: 'payloads',
            through: { attributes: [] }
          }
        ]
      });
    } else {
      // Otherwise, get only public scripts and user's own scripts
      scripts = await Script.findAll({
        where: {
          [Op.or]: [
            { userId },
            { isPublic: true }
          ]
        },
        include: [
          { 
            model: User, 
            as: 'creator', 
            attributes: ['id', 'username', 'email'] 
          },
          {
            model: Payload,
            as: 'payloads',
            through: { attributes: [] }
          }
        ]
      });
    }
    
    return res.status(200).json({
      success: true,
      data: scripts
    });
  } catch (error) {
    console.error('Error fetching scripts:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch scripts'
    });
  }
};

// Get a specific script
export const getScript = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    const script = await Script.findByPk(id, {
      include: [
        { 
          model: User, 
          as: 'creator', 
          attributes: ['id', 'username', 'email'] 
        },
        {
          model: Payload,
          as: 'payloads',
          through: { attributes: ['executionOrder'] }
        }
      ]
    });
    
    if (!script) {
      return res.status(404).json({
        success: false,
        message: 'Script not found'
      });
    }
    
    // Check if user has access to this script
    if (script.userId !== userId && !script.isPublic && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this script'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: script
    });
  } catch (error) {
    console.error('Error fetching script:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch script'
    });
  }
};

// Create a new script
export const createScript = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const { 
      name, 
      content, 
      type = 'callback', 
      description = null,
      isPublic = false,
      callbackUrl = null
    } = req.body;
    
    // Input validation
    if (!name || !content) {
      return res.status(400).json({
        success: false,
        message: 'Name and content are required'
      });
    }
    
    // Auto-detect script type if not specified
    let scriptType = type;
    if (content.includes('#!/bin/bash') || 
        content.includes('#!/bin/sh') || 
        content.trim().startsWith('sh ') ||
        name.endsWith('.sh')) {
      scriptType = 'command';
    } else if (content.includes('param(') || 
              content.includes('function ') || 
              content.includes('Write-Host') ||
              name.endsWith('.ps1')) {
      scriptType = 'command';
    }
    
    // Generate a unique endpoint for this script
    const endpoint = `scripts/${uuidv4().slice(0, 8)}`;
    
    const script = await Script.create({
      name,
      content,
      type: scriptType,
      description,
      userId,
      isPublic,
      endpoint,
      callbackUrl,
      lastExecuted: null,
      executionCount: 0
    });
    
    return res.status(201).json({
      success: true,
      message: 'Script created successfully',
      data: script
    });
  } catch (error) {
    console.error('Error creating script:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create script'
    });
  }
};

// Update a script
export const updateScript = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const script = await Script.findByPk(id);
    
    if (!script) {
      return res.status(404).json({
        success: false,
        message: 'Script not found'
      });
    }
    
    // Check if user has permission to update this script
    if (script.userId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this script'
      });
    }
    
    const { 
      name, 
      content, 
      type, 
      description,
      isPublic,
      callbackUrl
    } = req.body;
    
    // Update the script
    await script.update({
      name: name || script.name,
      content: content || script.content,
      type: type || script.type,
      description: description !== undefined ? description : script.description,
      isPublic: isPublic !== undefined ? isPublic : script.isPublic,
      callbackUrl: callbackUrl !== undefined ? callbackUrl : script.callbackUrl
    });
    
    return res.status(200).json({
      success: true,
      message: 'Script updated successfully',
      data: script
    });
  } catch (error) {
    console.error('Error updating script:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update script'
    });
  }
};

// Delete a script
export const deleteScript = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const script = await Script.findByPk(id);
    
    if (!script) {
      return res.status(404).json({
        success: false,
        message: 'Script not found'
      });
    }
    
    // Check if user has permission to delete this script
    if (script.userId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this script'
      });
    }
    
    // Delete the script
    await script.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'Script deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting script:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete script'
    });
  }
};

// Associate a script with a payload
export const associateScriptWithPayload = async (req: AuthRequest, res: Response) => {
  try {
    const { scriptId, payloadId, executionOrder = 0 } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Validate input
    if (!scriptId || !payloadId) {
      return res.status(400).json({
        success: false,
        message: 'Script ID and Payload ID are required'
      });
    }
    
    // Check if script exists
    const script = await Script.findByPk(scriptId);
    if (!script) {
      return res.status(404).json({
        success: false,
        message: 'Script not found'
      });
    }
    
    // Check if payload exists
    const payload = await Payload.findByPk(payloadId);
    if (!payload) {
      return res.status(404).json({
        success: false,
        message: 'Payload not found'
      });
    }
    
    // Check if user has permission to associate this script with this payload
    if (payload.userId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this payload'
      });
    }
    
    // Check if user has permission to use this script
    if (script.userId !== userId && !script.isPublic && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to use this script'
      });
    }
    
    // Check if association already exists
    let association = await PayloadScript.findOne({
      where: {
        scriptId,
        payloadId
      }
    });
    
    if (association) {
      // Update the execution order if association exists
      await association.update({ executionOrder });
    } else {
      // Create new association
      association = await PayloadScript.create({
        scriptId,
        payloadId,
        executionOrder
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Script associated with payload successfully',
      data: association
    });
  } catch (error) {
    console.error('Error associating script with payload:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to associate script with payload'
    });
  }
};

// Remove script association from payload
export const removeScriptFromPayload = async (req: AuthRequest, res: Response) => {
  try {
    const { scriptId, payloadId } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Validate input
    if (!scriptId || !payloadId) {
      return res.status(400).json({
        success: false,
        message: 'Script ID and Payload ID are required'
      });
    }
    
    // Check if payload exists and user has permission
    const payload = await Payload.findByPk(payloadId);
    if (!payload) {
      return res.status(404).json({
        success: false,
        message: 'Payload not found'
      });
    }
    
    if (payload.userId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this payload'
      });
    }
    
    // Delete the association
    const deleted = await PayloadScript.destroy({
      where: {
        scriptId,
        payloadId
      }
    });
    
    if (deleted === 0) {
      return res.status(404).json({
        success: false,
        message: 'Association not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Script removed from payload successfully'
    });
  } catch (error) {
    console.error('Error removing script from payload:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove script from payload'
    });
  }
};

// Get scripts for a specific payload
export const getScriptsForPayload = async (req: AuthRequest, res: Response) => {
  try {
    const { payloadId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Check if payload exists
    const payload = await Payload.findByPk(payloadId);
    if (!payload) {
      return res.status(404).json({
        success: false,
        message: 'Payload not found'
      });
    }
    
    // Check if user has permission to view this payload's scripts
    if (payload.userId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view scripts for this payload'
      });
    }
    
    // Get all scripts associated with this payload
    const scripts = await Script.findAll({
      include: [
        {
          model: Payload,
          as: 'payloads',
          where: { id: payloadId },
          through: { attributes: ['executionOrder'] }
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'email']
        }
      ]
    });
    
    return res.status(200).json({
      success: true,
      data: scripts
    });
  } catch (error) {
    console.error('Error fetching scripts for payload:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch scripts for payload'
    });
  }
};

// Execute a script (endpoint for device callbacks)
export const executeScript = async (req: Request, res: Response) => {
  try {
    const { endpoint } = req.params;
    
    // Find the script by endpoint
    const script = await Script.findOne({
      where: { endpoint }
    });
    
    if (!script) {
      return res.status(404).json({
        success: false,
        message: 'Script not found'
      });
    }
    
    // Update execution count and last executed timestamp
    await script.update({
      executionCount: script.executionCount + 1,
      lastExecuted: new Date()
    });
    
    // Store the incoming data if provided
    const data = req.body;
    let result: any = null;
    
    // Process the script based on its type
    switch (script.type) {
      case 'callback':
        // For callback scripts, just return success
        result = { executed: true, data: req.body };
        break;
        
      case 'exfiltration':
        // For exfiltration scripts, store the data and forward to callback URL if specified
        result = { 
          stored: true, 
          dataSize: JSON.stringify(data).length,
          forwarded: false
        };
        
        // Forward data to callback URL if specified
        if (script.callbackUrl) {
          try {
            await axios.post(script.callbackUrl, {
              scriptId: script.id,
              scriptName: script.name,
              executionTimestamp: new Date(),
              data: data
            });
            result.forwarded = true;
          } catch (error: any) {
            console.error('Error forwarding data to callback URL:', error);
            result.forwarded = false;
            result.forwardError = error.message;
          }
        }
        break;
        
      case 'command':
        // For command scripts, actually execute the script if server is configured to allow it
        // This would be a security risk in production without proper safeguards
        const { exec } = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(exec);
        
        // Determine script type and execution method
        let command;
        if (script.name.endsWith('.ps1') || 
            script.content.includes('function ') || 
            script.content.includes('Write-Host')) {
          // PowerShell script
          // Write script to temporary file
          const fs = require('fs');
          const os = require('os');
          const path = require('path');
          const tempFile = path.join(os.tmpdir(), `script_${script.id}.ps1`);
          fs.writeFileSync(tempFile, script.content);
          
          // Execute PowerShell script
          command = `powershell -ExecutionPolicy Bypass -File "${tempFile}"`;
        } else if (script.name.endsWith('.sh') || 
                  script.content.includes('#!/bin/bash') || 
                  script.content.includes('#!/bin/sh')) {
          // Shell script
          // Write script to temporary file
          const fs = require('fs');
          const os = require('os');
          const path = require('path');
          const tempFile = path.join(os.tmpdir(), `script_${script.id}.sh`);
          fs.writeFileSync(tempFile, script.content);
          fs.chmodSync(tempFile, '755'); // Make executable
          
          // Execute shell script
          command = `/bin/sh "${tempFile}"`;
        } else {
          // Generic script, try to execute directly
          command = script.content;
        }
        
        try {
          // Execute with timeout of 30 seconds
          const { stdout, stderr } = await execPromise(command, { timeout: 30000 });
          result = { 
            executed: true, 
            stdout: stdout, 
            stderr: stderr,
            exitCode: 0
          };
        } catch (error: any) {
          console.error('Error executing script:', error);
          result = { 
            executed: false, 
            error: error.message,
            stdout: error.stdout,
            stderr: error.stderr,
            exitCode: error.code
          };
        }
        break;
        
      case 'custom':
        // For custom scripts, let the client handle execution logic
        result = { handled: 'client-side', data: req.body };
        break;
        
      default:
        result = { executed: false, error: 'Unsupported script type' };
    }
    
    return res.status(200).json({
      success: true,
      message: 'Script executed successfully',
      data: {
        scriptId: script.id,
        scriptName: script.name,
        scriptType: script.type,
        executionCount: script.executionCount,
        executionTimestamp: script.lastExecuted,
        result
      }
    });
  } catch (error: any) {
    console.error('Error executing script:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to execute script',
      error: error.message
    });
  }
}; 