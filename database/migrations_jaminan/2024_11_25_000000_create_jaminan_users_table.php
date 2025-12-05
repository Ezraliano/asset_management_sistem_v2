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
        Schema::connection('mysql_jaminan')->create('jaminan_users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique(); // Username menggunakan email
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password'); // Hash password
            $table->enum('role', ['admin-kredit', 'admin-holding', 'super-admin']);
            $table->string('unit_name')->nullable()->comment('Unit name for admin-kredit (e.g., Unit Kajoetangan)');
            $table->rememberToken();
            $table->timestamps();

            // Index untuk email, role, dan unit_name
            $table->index('email');
            $table->index('role');
            $table->index('unit_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('mysql_jaminan')->dropIfExists('jaminan_users');
    }
};
