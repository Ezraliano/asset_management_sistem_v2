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
            $table->enum('repair_type', ['Perbaikan Ringan', 'Perbaikan Berat'])->nullable(); // Tipe perbaikan (hanya untuk Perbaikan)
            $table->date('date');
            $table->foreignId('unit_id')->nullable()->constrained('units')->onDelete('set null'); // Unit yang memperbaiki/memelihara
            $table->enum('party_type', ['Internal', 'External']); // Pihak yang menangani
            $table->string('instansi'); // Nama instansi yang memperbaiki/memelihara
            $table->string('phone_number'); // No Telepon
            $table->string('photo_proof')->nullable(); // Foto Bukti
            $table->text('description')->nullable(); // Deskripsi (optional)
            $table->enum('status', ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])->default('PENDING');

            // Validation fields
            $table->enum('validation_status', ['PENDING', 'APPROVED', 'REJECTED'])->default('PENDING'); // Status validasi
            $table->foreignId('validated_by')->nullable()->constrained('users')->onDelete('set null'); // User yang memvalidasi
            $table->timestamp('validation_date')->nullable(); // Tanggal validasi
            $table->text('validation_notes')->nullable(); // Catatan validasi

            // Completion fields
            $table->foreignId('completed_by')->nullable()->constrained('users')->onDelete('set null'); // User yang menyelesaikan
            $table->timestamp('completion_date')->nullable(); // Tanggal penyelesaian

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