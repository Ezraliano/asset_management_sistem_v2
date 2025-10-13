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

        $users = [
            [
                'name' => 'Super Admin',
                'email' => 'superadmin@example.com',
                'username' => 'superadmin',
                'password' => Hash::make('123'),
                'role' => 'Super Admin',
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
                'role' => 'Admin Holding',
                'unit_id' => null, // Admin Holding tidak terikat dengan unit tertentu
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Admin Unit Kajoetangan',
                'email' => 'unit@example.com',
                'username' => 'unit',
                'password' => Hash::make('123'),
                'role' => 'Admin Unit', // Changed from 'Unit' to 'Admin Unit'
                'unit_id' => $unitKajoetangan?->id, // Assign to Unit Kajoetangan
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
                'unit_id' => null, // Regular user tidak terikat dengan unit
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
        $this->command->info('Admin Unit Kajoetangan: unit / 123');
        $this->command->info('Regular User: user / 123');
    }
}