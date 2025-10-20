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
        Schema::create('asset_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('requester_unit_id')->constrained('units')->cascadeOnDelete();
            $table->foreignId('requester_id')->constrained('users')->cascadeOnDelete();
            $table->string('asset_name');
            $table->foreignId('asset_id')->nullable()->constrained('assets')->nullOnDelete();
            $table->date('request_date');
            $table->date('needed_date');
            $table->date('expected_return_date');
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->text('purpose');
            $table->text('reason');
            $table->enum('status', ['PENDING', 'APPROVED', 'REJECTED'])->default('PENDING');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('review_date')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->text('approval_notes')->nullable();
            $table->string('loan_photo_path')->nullable();

            // Loan tracking fields
            $table->enum('loan_status', ['NOT_STARTED', 'ACTIVE', 'PENDING_RETURN', 'RETURNED', 'OVERDUE'])->nullable();
            $table->date('actual_loan_date')->nullable();
            $table->date('actual_return_date')->nullable();
            $table->text('return_notes')->nullable();
            $table->string('return_proof_photo_path')->nullable();
            $table->foreignId('return_confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('return_confirmation_date')->nullable();
            $table->text('return_rejection_reason')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('asset_requests');
    }
};
