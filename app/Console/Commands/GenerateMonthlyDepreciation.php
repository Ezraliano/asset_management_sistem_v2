<?php
// app/Console/Commands/GenerateMonthlyDepreciation.php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\DepreciationService;

class GenerateMonthlyDepreciation extends Command
{
    protected $signature = 'depreciation:generate';
    protected $description = 'Generate monthly depreciation for all assets';

    public function __construct(private DepreciationService $depreciationService)
    {
        parent::__construct();
    }

    public function handle()
    {
        $this->info('🚀 Generating monthly depreciation...');
        
        try {
            $count = $this->depreciationService->generateCurrentMonthDepreciation();
            $this->info("✅ Monthly depreciation generated successfully! {$count} assets processed.");
        } catch (\Exception $e) {
            $this->error('❌ Error generating depreciation: ' . $e->getMessage());
            return Command::FAILURE; // ✅ GUNAKAN CONSTANT
        }
        
        return Command::SUCCESS; // ✅ GUNAKAN CONSTANT
    }
}