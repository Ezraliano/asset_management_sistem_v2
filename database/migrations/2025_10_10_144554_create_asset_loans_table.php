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
        Schema::create('asset_loans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained('assets')->cascadeOnDelete();
            $table->foreignId('borrower_id')->constrained('users')->cascadeOnDelete();
            $table->date('request_date');
            $table->date('loan_date')->nullable();
            $table->date('expected_return_date');
            $table->date('actual_return_date')->nullable();
            $table->text('purpose');
            $table->enum('status', ['PENDING', 'APPROVED', 'REJECTED', 'RETURNED'])->default('PENDING');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->date('approval_date')->nullable();
            $table->string('loan_proof_photo_path')->nullable();
            $table->text('return_notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('asset_loans');
    }
};