const BaseModel = require('./baseModel');

class Role extends BaseModel {
  static get tableName() {
    return 'roles';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name'],
      properties: {
        id: { type: 'integer' },
        name: { type: 'string', minLength: 1, maxLength: 50 },
        description: { type: 'string', maxLength: 255 }
      }
    };
  }

  static get relationMappings() {
    const Admin = require('./Admin');
    return {
      admins: {
        relation: BaseModel.HasManyRelation,
        modelClass: Admin,
        join: {
          from: 'roles.id',
          to: 'admins.role_id'
        }
      }
    };
  }
}

module.exports = Role;