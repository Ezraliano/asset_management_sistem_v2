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
        Schema::create('assets', function (Blueprint $table) {
            $table->id();
            $table->string('asset_tag')->unique(); // Menggantikan 'id' string di frontend
            $table->string('name');
            $table->string('category');
            $table->string('location');
            $table->decimal('value', 15, 2);
            $table->datetime('purchase_date');
            $table->integer('useful_life')->comment('in months');
            $table->enum('status', ['In Use', 'In Repair', 'Disposed', 'Lost']);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assets');
    }
};