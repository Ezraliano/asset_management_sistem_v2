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
        Schema::connection('mysql_jaminan')->create('guarantees', function (Blueprint $table) {
            $table->id();
            $table->string('spk_number')->unique();
            $table->string('cif_number');
            $table->string('spk_name');
            $table->string('credit_period');
            $table->string('guarantee_name');
            $table->enum('guarantee_type', ['BPKB', 'SHM', 'SHGB']);
            $table->string('guarantee_number');
            $table->string('file_location');
            $table->date('input_date');
            $table->enum('status', ['available', 'dipinjam', 'lunas'])->default('available');
            $table->timestamps();

            // Indexes untuk performa query
            $table->index('spk_number');
            $table->index('cif_number');
            $table->index('guarantee_type');
            $table->index('input_date');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('mysql_jaminan')->dropIfExists('guarantees');
    }
};
