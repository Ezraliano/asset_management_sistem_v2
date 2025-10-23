<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('inventory_audits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('unit_id')->constrained('units')->onDelete('cascade');
            $table->foreignId('auditor_id')->constrained('users')->onDelete('cascade');
            $table->string('audit_code')->unique()->comment('Kode unik audit (e.g., AUD-20251023-001)');
            $table->enum('scan_mode', ['camera', 'manual'])->default('camera');
            $table->enum('status', ['in_progress', 'completed', 'cancelled'])->default('in_progress');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->json('expected_asset_ids')->nullable()->comment('Array of asset IDs expected in the unit');
            $table->json('found_asset_ids')->nullable()->comment('Array of asset IDs found during audit');
            $table->json('misplaced_assets')->nullable()->comment('Array of misplaced assets with details');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('unit_id');
            $table->index('auditor_id');
            $table->index('status');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_audits');
    }
};
