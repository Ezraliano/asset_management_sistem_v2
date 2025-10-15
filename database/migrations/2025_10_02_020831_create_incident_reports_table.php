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
        Schema::create('incident_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained('assets')->onDelete('cascade');
            $table->foreignId('reporter_id')->constrained('users')->onDelete('restrict');
            $table->enum('type', ['Damage', 'Loss']);
            $table->text('description');
            $table->date('date');
            $table->enum('status', ['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED'])->default('PENDING');
            // Evidence and review fields
            $table->string('evidence_photo_path')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('review_date')->nullable();
            $table->text('resolution_notes')->nullable();
            $table->string('responsible_party')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('incident_reports');
    }
};