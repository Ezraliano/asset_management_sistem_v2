<?php

namespace Database\Seeders;

use App\Models_jaminan\Guarantee;
use App\Models_jaminan\Unit;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class GuaranteeUnitSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Assign units to existing guarantees in a round-robin fashion
     */
    public function run(): void
    {
        // Set the connection for this seeder to jaminan database
        \Illuminate\Support\Facades\DB::setDefaultConnection('mysql_jaminan');

        // Get all active units
        $units = Unit::active()->orderByName()->get();

        if ($units->isEmpty()) {
            $this->command->warn('No active units found. Please seed the units table first.');
            return;
        }

        // Get all guarantees without unit_name assigned
        $guarantees = Guarantee::whereNull('unit_name')->get();

        if ($guarantees->isEmpty()) {
            $this->command->info('All guarantees already have units assigned or no guarantees found.');
            return;
        }

        // Assign units to guarantees in a round-robin fashion
        $guaranteeCount = $guarantees->count();
        $unitCount = $units->count();
        $assignedCount = 0;

        foreach ($guarantees as $index => $guarantee) {
            // Assign unit based on index using round-robin
            $unitIndex = $index % $unitCount;
            $unit = $units[$unitIndex];
            $guarantee->update(['unit_name' => $unit->name]);
            $assignedCount++;
        }

        $this->command->info("Guarantee units seeded successfully!");
        $this->command->info("Total guarantees assigned: {$assignedCount}");
        $this->command->info("Units available: {$unitCount}");
    }
}
