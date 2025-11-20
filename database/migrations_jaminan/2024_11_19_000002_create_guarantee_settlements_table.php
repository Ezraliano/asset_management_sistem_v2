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

            // Indexes untuk performa query
            $table->index('guarantee_id');
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
