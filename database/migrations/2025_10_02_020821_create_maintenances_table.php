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
        Schema::create('maintenances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained('assets')->onDelete('cascade');
            $table->enum('type', ['Perbaikan', 'Pemeliharaan']); // Tipe: Perbaikan atau Pemeliharaan
            $table->date('date');
            $table->foreignId('unit_id')->nullable()->constrained('units')->onDelete('set null'); // Unit yang memperbaiki/memelihara
            $table->enum('party_type', ['Internal', 'External']); // Pihak yang menangani
            $table->string('technician_name'); // Nama orang yang memperbaiki/memelihara
            $table->string('phone_number'); // No Telepon
            $table->string('photo_proof')->nullable(); // Foto Bukti
            $table->text('description')->nullable(); // Deskripsi (optional)
            $table->enum('status', ['Scheduled', 'In Progress', 'Completed', 'Cancelled'])->default('Completed');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('maintenances');
    }
};