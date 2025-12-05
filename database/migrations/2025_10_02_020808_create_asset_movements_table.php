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
        Schema::create('asset_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained('assets')->onDelete('cascade');
            $table->string('from_unit_name')->nullable()->comment('Unit name from where asset is moved');
            $table->string('to_unit_name')->nullable()->comment('Unit name to where asset is moved');
            $table->index('from_unit_name');
            $table->index('to_unit_name');
            $table->foreignId('requested_by_id')->constrained('users')->onDelete('restrict');
            $table->foreignId('validated_by_id')->nullable()->constrained('users')->onDelete('restrict');
            $table->enum('status', ['PENDING', 'APPROVED', 'REJECTED'])->default('PENDING');
            $table->text('notes')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamp('requested_at');
            $table->timestamp('validated_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('asset_movements');
    }
};