<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    public function run(): void
    {
        // Default departments commonly found in City Hall workflows.
        // Codes are used in document code generation: CH-YYYY-DEPT-XXXX
        $departments = [
            ['name' => 'Budget Office', 'code' => 'BUD'],
            ['name' => 'Accounting Office', 'code' => 'ACC'],
            ['name' => 'Treasurer\'s Office', 'code' => 'TRE'],
            ['name' => 'Mayor\'s Office', 'code' => 'MAY'],
            ['name' => 'Human Resources', 'code' => 'HR'],
            ['name' => 'General Services', 'code' => 'GSO'],
        ];

        foreach ($departments as $dept) {
            Department::updateOrCreate(
                ['code' => $dept['code']],
                ['name' => $dept['name']]
            );
        }
    }
}

