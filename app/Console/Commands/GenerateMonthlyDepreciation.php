<?php

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
            // Gunakan method yang sudah diperbaiki
            $results = $this->depreciationService->generateAutoDepreciation();
            $this->info("✅ Monthly depreciation generated successfully! {$results['total_processed']} months processed across {$results['assets_processed']} assets.");
        } catch (\Exception $e) {
            $this->error('❌ Error generating depreciation: ' . $e->getMessage());
            return Command::FAILURE;
        }
        
        return Command::SUCCESS;
    }
}