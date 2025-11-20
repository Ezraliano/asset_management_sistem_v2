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
        Schema::connection('mysql_jaminan')->create('guarantee_loans', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('guarantee_id');
            $table->string('spk_number');
            $table->string('cif_number');
            $table->enum('guarantee_type', ['BPKB', 'SHM', 'SHGB']);
            $table->string('file_location');
            $table->string('borrower_name');
            $table->string('borrower_contact');
            $table->text('reason');
            $table->date('loan_date');
            $table->date('expected_return_date')->nullable();
            $table->date('actual_return_date')->nullable();
            $table->enum('status', ['active', 'returned'])->default('active');
            $table->timestamps();

            // Foreign key
            $table->foreign('guarantee_id')
                ->references('id')
                ->on('guarantees')
                ->onDelete('cascade');

            // Indexes untuk performa query
            $table->index('guarantee_id');
            $table->index('spk_number');
            $table->index('loan_date');
            $table->index('status');
            $table->index('expected_return_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('mysql_jaminan')->dropIfExists('guarantee_loans');
    }
};
