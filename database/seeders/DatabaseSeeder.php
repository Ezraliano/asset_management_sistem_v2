<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            UnitSeeder::class,  // Harus dijalankan SEBELUM UserSeeder
            UserSeeder::class,
            JaminanUnitSeeder::class,  // Seed units untuk database mysql_jaminan
            JaminanUserSeeder::class,  // Seed users untuk database mysql_jaminan
            GuaranteeUnitSeeder::class,  // Seed guarantees untuk database mysql_jaminan
        ]);
    }
}
