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
        $users = [
            [
                'name' => 'Administrator',
                'email' => 'admin@example.com',
                'username' => 'admin',
                'password' => Hash::make('123'),
                'role' => 'Admin',
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Staff User',
                'email' => 'user@example.com',
                'username' => 'user',
                'password' => Hash::make('123'),
                'role' => 'Staff',
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Auditor',
                'email' => 'audit@example.com',
                'username' => 'audit',
                'password' => Hash::make('123'),
                'role' => 'Audit',
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        DB::table('users')->insert($users);

        $this->command->info('Users seeded successfully!');
        $this->command->info('Admin credentials: admin / 123');
        $this->command->info('Staff credentials: user / 123');
        $this->command->info('Audit credentials: audit / 123');
    }
}