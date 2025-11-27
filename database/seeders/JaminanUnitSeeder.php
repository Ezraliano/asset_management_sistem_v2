<?php

namespace Database\Seeders;

use App\Models_jaminan\Unit;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class JaminanUnitSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Set the connection for this seeder to jaminan database
        \Illuminate\Support\Facades\DB::setDefaultConnection('mysql_jaminan');

        $units = [
            [
                'code' => 'HOLDING',
                'name' => 'Unit Holding',
                'description' => 'Unit Kantor Pusat / Holding',
                'location' => 'Jl. Raya Holding No. 123, Jakarta',
                'is_active' => true,
            ],
            [
                'code' => 'KAJOETANGAN',
                'name' => 'Unit Kajoetangan',
                'description' => 'Unit Cabang Kajoetangan',
                'location' => 'Jl. Raya Kajoetangan No. 456, Malang',
                'is_active' => true,
            ],
            [
                'code' => 'BATU',
                'name' => 'Unit Batu',
                'description' => 'Unit Cabang Batu',
                'location' => 'Jl. Raya Batu No. 789, Batu',
                'is_active' => true,
            ],
        ];

        foreach ($units as $unit) {
            Unit::create($unit);
        }

        $this->command->info('Jaminan Units seeded successfully!');
    }
}
