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
        Schema::create('asset_sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained('assets')->onDelete('cascade');
            $table->foreignId('sold_by_id')->constrained('users')->onDelete('restrict');
            $table->decimal('sale_price', 15, 2)->comment('Harga jual asset');
            $table->datetime('sale_date')->comment('Tanggal penjualan');
            $table->string('buyer_name')->comment('Nama pembeli');
            $table->string('buyer_contact')->nullable()->comment('Kontak pembeli (telepon/email)');
            $table->string('sale_proof_path')->nullable()->comment('Path ke file bukti jual');
            $table->text('reason')->comment('Alasan penjualan');
            $table->text('notes')->nullable()->comment('Catatan tambahan');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('asset_sales');
    }
};
