<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Document extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'date',
        'encoded_by_id',
        'type_of_document',
        'document_code',
        'document_number',
        'pay_claimant',
        'particular',
        'amount',
        'department_id',
        'status',
        'remarks',
        'date_out',
    ];

    protected $casts = [
        'date' => 'date',
        'date_out' => 'date',
        'amount' => 'decimal:2',
    ];

    public function encodedBy()
    {
        return $this->belongsTo(User::class, 'encoded_by_id');
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }
}

