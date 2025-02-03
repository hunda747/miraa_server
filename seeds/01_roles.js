/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function (knex) {
  // Deletes ALL existing entries
  return knex('roles').del()
    .then(function () {
      // Inserts seed entries
      return knex('roles').insert([
        {
          name: 'super_admin',
          description: 'Has full access to all features'
        },
        {
          name: 'shop_manager',
          description: 'Can manage shop and products'
        },
        {
          name: 'order_manager',
          description: 'Can manage orders'
        }
      ]);
    });
};
