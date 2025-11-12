<?php

namespace Database\Seeders;

use App\Models\Unit;
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

        // Get unit Kajoetangan
        $unitKajoetangan = Unit::where('code', 'KAJOETANGAN')->first();

        // Get unit Batu
        $unitBatu = Unit::where('code', 'BATU')->first();

        $users = [
            [
                'name' => 'Super Admin',
                'email' => 'superadmin@example.com',
                'username' => 'superadmin',
                'password' => Hash::make('123'),
                'role' => 'super-admin',
                'unit_id' => null, // Super Admin tidak terikat dengan unit tertentu
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Admin Holding',
                'email' => 'adminholding@example.com',
                'username' => 'adminholding',
                'password' => Hash::make('123'),
                'role' => 'admin',
                'unit_id' => null, // Admin Holding tidak terikat dengan unit tertentu
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Admin Unit Kajoetangan',
                'email' => 'unit@example.com',
                'username' => 'unitkajoetangan',
                'password' => Hash::make('123'),
                'role' => 'unit', // Changed from 'Admin Unit' to 'unit'
                'unit_id' => $unitKajoetangan?->id, // Assign to Unit Kajoetangan
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Admin Unit Batu',
                'email' => 'adminbatu@example.com',
                'username' => 'unitbatu',
                'password' => Hash::make('123'),
                'role' => 'unit',
                'unit_id' => $unitBatu?->id,
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Regular User - Kajoetangan',
                'email' => 'user@example.com',
                'username' => 'user',
                'password' => Hash::make('123'),
                'role' => 'user',
                'unit_id' => $unitKajoetangan?->id, // Regular user terikat dengan unit Kajoetangan
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Auditor',
                'email' => 'auditor@example.com',
                'username' => 'auditor',
                'password' => Hash::make('123'),
                'role' => 'auditor',
                'unit_id' => null, // Auditor tidak terikat dengan unit tertentu
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        DB::table('users')->insert($users);
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $this->command->info('Users seeded successfully with new roles!');
        $this->command->info('Super Admin (super-admin): superadmin / 123');
        $this->command->info('Admin Holding (admin): adminholding / 123');
        $this->command->info('Admin Unit Kajoetangan (unit): unitkajoetangan / 123');
        $this->command->info('Admin Unit Batu (unit): unitbatu / 123');
        $this->command->info('Regular User (user): user / 123');
        $this->command->info('Auditor (auditor): auditor / 123');
    }
}