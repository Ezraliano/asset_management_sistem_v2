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
        Schema::connection('mysql_jaminan')->create('units', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique()->comment('Unit code (e.g., HOLDING, KAJOETANGAN)');
            $table->string('name')->comment('Unit name (e.g., Unit Holding, Unit Kajoetangan)');
            $table->string('description')->nullable()->comment('Unit description');
            $table->string('location')->nullable()->comment('Unit location/address');
            $table->boolean('is_active')->default(true)->comment('Unit status');
            $table->timestamps();

            // Indexes
            $table->index('code');
            $table->index('name');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('mysql_jaminan')->dropIfExists('units');
    }
};
