import { Component, ChangeDetectionStrategy } from '@angular/core';



import { RouterModule } from '@angular/router';



@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-learning-course',

  imports: [RouterModule],

  template: `

    <div class="min-h-screen bg-gray-50 pt-16">

      <div class="container mx-auto px-4 py-6">

        <div class="bg-white rounded-lg shadow p-6">

          <h1 class="text-2xl font-bold text-gray-900 mb-4">Khóa h?c</h1>

          <p class="text-gray-600">Frontend ð? ðý?c khôi ph?c thành công!</p>

        </div>

      </div>

    </div>

  `

})

export class LearningCourseComponent {}

