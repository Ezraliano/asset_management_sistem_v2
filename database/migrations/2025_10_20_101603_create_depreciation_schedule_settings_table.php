<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('depreciation_schedule_settings', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique(); // 'auto_depreciation'
            $table->boolean('is_active')->default(true);
            $table->enum('frequency', ['daily', 'weekly', 'monthly', 'custom'])->default('daily');
            $table->time('execution_time')->default('00:00:00'); // Waktu eksekusi (HH:MM:SS)
            $table->string('timezone')->default('Asia/Jakarta');
            $table->string('cron_expression')->nullable(); // Untuk custom frequency
            $table->integer('day_of_week')->nullable(); // 0-6 untuk weekly (0 = Minggu)
            $table->integer('day_of_month')->nullable(); // 1-31 untuk monthly
            $table->timestamp('last_run_at')->nullable();
            $table->timestamp('next_run_at')->nullable();
            $table->json('last_run_result')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // Insert default schedule
        DB::table('depreciation_schedule_settings')->insert([
            'name' => 'auto_depreciation',
            'is_active' => true,
            'frequency' => 'daily',
            'execution_time' => '13:15:00',
            'timezone' => 'Asia/Jakarta',
            'description' => 'Automatic depreciation generation schedule',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('depreciation_schedule_settings');
    }
};
