
▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/courses/shared/course-card.component.ts:82:35:
      82 │             {{ (course.instructor?.name || 'G')[0] }}
         ╵                                    ~~~~


▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/courses/shared/course-card.component.ts:85:79:
      85 │ ...ext-gray-800">{{ course.instructor?.name || 'Giảng viên' }}</p>
         ╵                                        ~~~~


▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/courses/shared/course-card.component.ts:86:67:
      86 │ ...xt-gray-400">{{ course.instructor?.title || 'Giảng viên' }}</p>
         ╵                                       ~~~~~


Page reload sent to client(s).
[APP INIT] Running in SSR context, skipping localStorage access
Terminate batch job (Y/N)? 
^C
E:\Sach\Sua\LMS_hohulili\fe>

E:\Sach\Sua\LMS_hohulili\fe>npm start

> lms-angular@0.0.0 start
> ng serve

Application bundle generation failed. [39.920 seconds] - 2025-12-24T06:45:57.406Z

▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/courses/shared/course-card.component.ts:82:35:
      82 │             {{ (course.instructor?.name || 'G')[0] }}
         ╵                                    ~~~~


▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/courses/shared/course-card.component.ts:85:79:
      85 │ ...ext-gray-800">{{ course.instructor?.name || 'Giảng viên' }}</p>
         ╵                                        ~~~~


▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/courses/shared/course-card.component.ts:86:67:
      86 │ ...xt-gray-400">{{ course.instructor?.title || 'Giảng viên' }}</p>
         ╵                                       ~~~~~


▲ [WARNING] Deprecation [plugin angular-sass]

    src/app/features/student/student-my-courses.component.ts:2:12:
      2 │     @import '../../../styles/variables';
        ╵             ^


  Sass @import rules are deprecated and will be removed in Dart Sass 3.0.0.

  More info and automated migrator: https://sass-lang.com/d/import


X [ERROR] TS2339: Property 'isPendingStatus' does not exist on type 'CourseManagementComponent'. [plugin angular-compiler]

    src/app/features/admin/presentation/components/course-management.component.ts:261:31:
      261 │                           @if (isPendingStatus(course.status)) {
          ╵                                ~~~~~~~~~~~~~~~


X [ERROR] TS2339: Property 'isApprovedStatus' does not exist on type 'CourseManagementComponent'. [plugin angular-compiler]

    src/app/features/admin/presentation/components/course-management.component.ts:278:31:
      278 │                           @if (isApprovedStatus(course.status)) {
          ╵                                ~~~~~~~~~~~~~~~~


X [ERROR] TS2339: Property 'revokeCourse' does not exist on type 'CourseManagementComponent'. [plugin angular-compiler]

    src/app/features/admin/presentation/components/course-management.component.ts:279:45:
      279 │ ...                        <button (click)="revokeCourse(course.id)"
          ╵                                             ~~~~~~~~~~~~


X [ERROR] TS1185: Merge conflict marker encountered. [plugin angular-compiler]

    src/app/features/admin/presentation/components/course-management.component.ts:866:0:
      866 │ <<<<<<< HEAD
          ╵ ~~~~~~~


X [ERROR] TS1185: Merge conflict marker encountered. [plugin angular-compiler]

    src/app/features/admin/presentation/components/course-management.component.ts:868:0:
      868 │ =======
          ╵ ~~~~~~~


X [ERROR] TS1185: Merge conflict marker encountered. [plugin angular-compiler]

    src/app/features/admin/presentation/components/course-management.component.ts:897:0:
      897 │ >>>>>>> 05bb7d9 (feat: Admin Teacher Co-op Courses Display + Cour...
          ╵ ~~~~~~~


X [ERROR] TS2307: Cannot find module 'video.js' or its corresponding type declarations. [plugin angular-compiler]

    src/app/shared/components/video-player-tracked/video-player-tracked.component.ts:14:20:
      14 │ import videojs from 'video.js';
         ╵                     ~~~~~~~~~~


X [ERROR] TS2307: Cannot find module 'video.js/dist/types/player' or its corresponding type declarations. [plugin angular-compiler]

    src/app/shared/components/video-player-tracked/video-player-tracked.component.ts:15:19:
      15 │ import Player from 'video.js/dist/types/player';
         ╵                    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~


X [ERROR] Could not resolve "node_modules/video.js/dist/video-js.min.css"

    angular:styles/global:styles:3:8:
      3 │ @import 'node_modules/video.js/dist/video-js.min.css';
        ╵         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  You can mark the path "node_modules/video.js/dist/video-js.min.css" as external to exclude it from the bundle, which will remove this error and leave the unresolved path in the bundle.
