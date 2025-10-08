<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\DepreciationService;

class GenerateAutoDepreciation extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'depreciation:generate-auto';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate automatic depreciation based on purchase date and time';

    public function __construct(private DepreciationService $depreciationService)
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🚀 Starting automatic depreciation generation...');
        
        try {
            $results = $this->depreciationService->generateAutoDepreciation();
            
            $this->info("✅ Automatic depreciation completed!");
            $this->info("📊 Total assets processed: {$results['total_assets']}");
            $this->info("📈 Months processed: {$results['total_processed']}");
            $this->info("🏷️ Assets with depreciation: {$results['assets_processed']}");
            
            // Log detailed results
            foreach ($results['details'] as $detail) {
                if ($detail['processed_months'] > 0) {
                    $this->info("   ✅ {$detail['asset_tag']}: {$detail['processed_months']} months");
                }
            }
            
        } catch (\Exception $e) {
            $this->error('❌ Error generating automatic depreciation: ' . $e->getMessage());
            return Command::FAILURE;
        }
        
        return Command::SUCCESS;
    }
}