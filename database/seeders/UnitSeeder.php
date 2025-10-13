<?php

namespace Database\Seeders;

use App\Models\Unit;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class UnitSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $units = [
            [
                'code' => 'HOLDING',
                'name' => 'Unit Holding',
                'description' => 'Unit Kantor Pusat / Holding',
                'address' => 'Jl. Raya Holding No. 123, Jakarta',
                'is_active' => true,
            ],
            [
                'code' => 'KAJOETANGAN',
                'name' => 'Unit Kajoetangan',
                'description' => 'Unit Cabang Kajoetangan',
                'address' => 'Jl. Raya Kajoetangan No. 456, Malang',
                'is_active' => true,
            ],
            [
                'code' => 'BATU',
                'name' => 'Unit Batu',
                'description' => 'Unit Cabang Batu',
                'address' => 'Jl. Raya Batu No. 789, Batu',
                'is_active' => true,
            ],
        ];

        foreach ($units as $unit) {
            Unit::create($unit);
        }

        $this->command->info('Units seeded successfully!');
    }
}
