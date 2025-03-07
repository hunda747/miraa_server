const Role = require('../models/RoleModel');

class RoleController {
  // Get all roles
  async getAllRoles(req, res) {
    try {
      const roles = await Role.find();
      const filteredRoles = roles.filter(role => role.name !== 'SUPER_ADMIN');
      // console.log("filteredRoles", filteredRoles);
      // console.log("roles", roles);
      res.json(
        filteredRoles
      );
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching roles',
        error: error.message
      });
    }
  }

  // Get role by ID
  async getRoleById(req, res) {
    try {
      const { id } = req.params;
      const role = await Role.findById(id);

      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      res.json({
        success: true,
        data: role
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching role',
        error: error.message
      });
    }
  }

  // Create new role
  async createRole(req, res) {
    try {
      const { name, description } = req.body;

      // Validate required fields
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Role name is required'
        });
      }

      // Check if role already exists
      const existingRole = await Role.findOne({ name });
      if (existingRole) {
        return res.status(400).json({
          success: false,
          message: 'Role with this name already exists'
        });
      }

      const newRole = await Role.create({
        name,
        description
      });

      res.status(201).json({
        success: true,
        data: newRole,
        message: 'Role created successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating role',
        error: error.message
      });
    }
  }

  // Update role
  async updateRole(req, res) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      // Check if role exists
      const role = await Role.findById(id);
      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      // Check if new name already exists (if name is being updated)
      if (name && name !== role.name) {
        const existingRole = await Role.findOne({ name });
        if (existingRole) {
          return res.status(400).json({
            success: false,
            message: 'Role with this name already exists'
          });
        }
      }

      const updatedRole = await Role.findByIdAndUpdate(
        id,
        {
          name: name || role.name,
          description: description || role.description
        },
        { new: true } // Return the updated document
      );

      res.json({
        success: true,
        data: updatedRole,
        message: 'Role updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating role',
        error: error.message
      });
    }
  }

  // Delete role
  async deleteRole(req, res) {
    try {
      const { id } = req.params;

      // Check if role exists
      const role = await Role.findById(id);
      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      // Check if role is assigned to any admin
      const adminCount = await role.populate('admins').then(role => role.admins.length);
      if (adminCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete role as it is assigned to admins'
        });
      }

      await Role.findByIdAndDelete(id);

      res.json({
        success: true,
        message: 'Role deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting role',
        error: error.message
      });
    }
  }
}

module.exports = new RoleController();
