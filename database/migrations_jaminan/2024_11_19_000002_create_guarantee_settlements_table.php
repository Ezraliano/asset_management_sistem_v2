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
        Schema::connection('mysql_jaminan')->create('guarantee_settlements', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('guarantee_id');
            $table->unsignedBigInteger('loan_id');
            $table->string('spk_number');
            $table->string('cif_number');
            $table->string('guarantee_name');
            $table->enum('guarantee_type', ['BPKB', 'SHM', 'SHGB']);
            $table->string('borrower_name');
            $table->string('borrower_contact');
            $table->date('loan_date');
            $table->date('expected_return_date')->nullable();
            $table->date('settlement_date');
            $table->text('settlement_notes')->nullable();
            $table->enum('settlement_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->string('settled_by')->nullable();
            $table->text('settlement_remarks')->nullable();
            $table->timestamps();

            // Foreign keys
            $table->foreign('guarantee_id')
                ->references('id')
                ->on('guarantees')
                ->onDelete('cascade');

            $table->foreign('loan_id')
                ->references('id')
                ->on('guarantee_loans')
                ->onDelete('cascade');

            // Indexes untuk performa query
            $table->index('guarantee_id');
            $table->index('loan_id');
            $table->index('spk_number');
            $table->index('settlement_date');
            $table->index('settlement_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('mysql_jaminan')->dropIfExists('guarantee_settlements');
    }
};
