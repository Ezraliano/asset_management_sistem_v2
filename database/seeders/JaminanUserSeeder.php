<?php

namespace Database\Seeders;

use App\Models_jaminan\JaminanUser;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class JaminanUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Set the connection for this seeder
        \Illuminate\Support\Facades\DB::setDefaultConnection('mysql_jaminan');

        // Create Super Admin
        JaminanUser::create([
            'name' => 'Super Admin Jaminan',
            'email' => 'superadmin@jaminan.local',
            'password' => Hash::make('password'), // Hash dari string "password"
            'role' => 'super-admin',
        ]);

        // Create Admin Holding
        JaminanUser::create([
            'name' => 'Admin Holding Jaminan',
            'email' => 'admin.holding@jaminan.local',
            'password' => Hash::make('password'),
            'role' => 'admin-holding',
        ]);

        // Create Admin Kredit
        JaminanUser::create([
            'name' => 'Admin Kredit 1',
            'email' => 'admin.kredit1@jaminan.local',
            'password' => Hash::make('password'),
            'role' => 'admin-kredit',
        ]);

        // Create additional Admin Kredit
        JaminanUser::create([
            'name' => 'Admin Kredit 2',
            'email' => 'admin.kredit2@jaminan.local',
            'password' => Hash::make('password'),
            'role' => 'admin-kredit',
        ]);

        $this->command->info('Jaminan Users seeded successfully!');
        $this->command->info('Default credentials:');
        $this->command->line('Email: superadmin@jaminan.local | Role: Superadmin | Password: password');
        $this->command->line('Email: admin.holding@jaminan.local | Role: Admin Holding | Password: password');
        $this->command->line('Email: admin.kredit1@jaminan.local | Role: Admin Kredit | Password: password');
        $this->command->line('Email: admin.kredit2@jaminan.local | Role: Admin Kredit | Password: password');
    }
}
