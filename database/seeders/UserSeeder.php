<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('users')->truncate(); // Clear the table first

        $users = [
            [
                'name' => 'Super Admin',
                'email' => 'superadmin@example.com',
                'username' => 'superadmin',
                'password' => Hash::make('123'),
                'role' => 'Super Admin',
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Admin Holding',
                'email' => 'adminholding@example.com',
                'username' => 'adminholding',
                'password' => Hash::make('123'),
                'role' => 'Admin Holding',
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Unit User',
                'email' => 'unit@example.com',
                'username' => 'unit',
                'password' => Hash::make('123'),
                'role' => 'Unit',
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Regular User',
                'email' => 'user@example.com',
                'username' => 'user',
                'password' => Hash::make('123'),
                'role' => 'User',
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        DB::table('users')->insert($users);
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $this->command->info('Users seeded successfully with new roles!');
        $this->command->info('Super Admin: superadmin / 123');
        $this->command->info('Admin Holding: adminholding / 123');
        $this->command->info('Unit User: unit / 123');
        $this->command->info('Regular User: user / 123');
    }
}