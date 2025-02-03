const BaseModel = require('./baseModel');
const bcrypt = require('bcrypt');

class Admin extends BaseModel {
  static get tableName() {
    return 'admins';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['username', 'email', 'password'],
      properties: {
        id: { type: 'integer' },
        username: { type: 'string', minLength: 3, maxLength: 50 },
        email: { type: 'string', format: 'email', maxLength: 100 },
        password: { type: 'string', minLength: 6, maxLength: 255 },
        role_id: { type: 'integer' },
        created_at: { type: 'string' },
        updated_at: { type: 'string' }
      }
    };
  }

  static get relationMappings() {
    const Role = require('./Role');
    return {
      role: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: Role,
        join: {
          from: 'admins.role_id',
          to: 'roles.id'
        }
      }
    };
  }

  // Hash password before inserting
  async $beforeInsert(context) {
    await super.$beforeInsert(context);
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }

  // Hash password before updating
  async $beforeUpdate(opt, context) {
    await super.$beforeUpdate(opt, context);
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }

  // Remove password when converting to JSON
  $formatJson(json) {
    json = super.$formatJson(json);
    delete json.password;
    return json;
  }

  // Verify password
  async verifyPassword(password) {
    return bcrypt.compare(password, this.password);
  }
}

module.exports = Admin;