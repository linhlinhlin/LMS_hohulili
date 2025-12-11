E:\Sach\Sua\LMS_hohulili\fe>npm start

> lms-angular@0.0.0 start
> ng serve

Browser bundles
Initial chunk files  | Names                            |  Raw size
chunk-YDATSUFZ.js    | -                                | 178.97 kB | 
styles.css           | styles                           | 172.39 kB | 
main.js              | main                             | 169.63 kB | 
chunk-XP4M36AM.js    | -                                |  67.48 kB | 
chunk-YBCQXFCY.js    | -                                |   6.44 kB | 
chunk-VST4WLVK.js    | -                                |   6.25 kB | 
chunk-W2NSQ5PU.js    | -                                |   3.60 kB | 
chunk-NRFGODES.js    | -                                |   1.31 kB | 
chunk-N66WO4GR.js    | -                                | 280 bytes | 

                     | Initial total                    | 606.36 kB

Lazy chunk files     | Names                            |  Raw size
chunk-3LC35HU6.js    | section-editor-component         | 461.28 kB | 
chunk-URKJEBOZ.js    | course-learning-component        | 193.15 kB | 
chunk-A6SBIP7P.js    | user-management-component        | 157.48 kB | 
chunk-5OEC6VV3.js    | course-detail-enhanced-component | 148.78 kB | 
chunk-TNDM4RLY.js    | student-detail-component         | 140.81 kB | 
chunk-FJHQA4SW.js    | quiz-bank-component              | 137.65 kB | 
chunk-FEI7TTO5.js    | ai-chat-full-page-component      | 118.48 kB | 
chunk-PIHO7EAP.js    | courses-component                | 108.58 kB | 
chunk-26IZRJQU.js    | configurable-category-component  |  96.27 kB | 
chunk-QMBRSOQ3.js    | course-management-component      |  94.26 kB | 
chunk-PWQV3CNX.js    | -                                |  94.03 kB | 
chunk-H2INISCY.js    | course-editor-component          |  91.55 kB | 
chunk-7SKIUAG3.js    | ai-knowledge-page-component      |  88.82 kB | 
chunk-AUNWQJBB.js    | assignment-creation-component    |  88.02 kB | 
chunk-IUWWRO2Y.js    | student-dashboard-component      |  84.48 kB | 
...and 99 more lazy chunks files. Use "--verbose" to show all the files.


Server bundles
Initial chunk files  | Names                            |  Raw size
chunk-SI5HIBQT.mjs   | -                                | 179.00 kB | 
main.server.mjs      | main.server                      | 173.93 kB | 
chunk-GZB4J5YB.mjs   | -                                |  67.52 kB | 
chunk-Y5JTAIZB.mjs   | -                                |   6.48 kB | 
chunk-33M4SCFC.mjs   | -                                |   6.29 kB | 
chunk-CRWHBT3W.mjs   | -                                |   3.64 kB | 
chunk-5JLFZNSN.mjs   | -                                |   1.34 kB | 
server.mjs           | server                           |   1.00 kB | 
chunk-ER7I2CFR.mjs   | -                                | 315 bytes | 
polyfills.server.mjs | polyfills.server                 | 243 bytes | 

Lazy chunk files     | Names                            |  Raw size
chunk-XLK5K526.mjs   | section-editor-component         | 461.32 kB | 
chunk-KRFDN32O.mjs   | course-learning-component        | 193.19 kB | 
chunk-V6PKWLSR.mjs   | user-management-component        | 157.52 kB | 
chunk-KJTUUB5Z.mjs   | course-detail-enhanced-component | 148.81 kB | 
chunk-AF7RGKGJ.mjs   | student-detail-component         | 140.85 kB | 
chunk-HXDPJ32M.mjs   | quiz-bank-component              | 137.69 kB | 
chunk-66VD5NYK.mjs   | ai-chat-full-page-component      | 118.52 kB | 
chunk-NPUAZ4AA.mjs   | courses-component                | 108.62 kB | 
chunk-R5PCZLUH.mjs   | configurable-category-component  |  96.30 kB | 
chunk-W4QX6TYZ.mjs   | course-management-component      |  94.30 kB | 
chunk-TSU3UR7X.mjs   | -                                |  94.06 kB | 
chunk-ZYBYPA5Y.mjs   | course-editor-component          |  91.58 kB | 
chunk-SDQN437L.mjs   | ai-knowledge-page-component      |  88.85 kB | 
chunk-HVS7J7TR.mjs   | assignment-creation-component    |  88.06 kB | 
chunk-D7JGW5XA.mjs   | student-dashboard-component      |  84.53 kB | 
...and 99 more lazy chunks files. Use "--verbose" to show all the files.

Application bundle generation complete. [26.711 seconds] - 2025-12-11T14:17:49.293Z

▲ [WARNING] NG8113: ErrorDisplayComponent is not used within the template of App [plugin angular-compiler]

    src/app/app.ts:7:26:
      7 │   imports: [RouterOutlet, ErrorDisplayComponent],
        ╵                           ~~~~~~~~~~~~~~~~~~~~~


▲ [WARNING] NG8113: LoadingComponent is not used within the template of AdminAnalyticsComponent
 [plugin angular-compiler]

    src/app/features/admin/presentation/components/admin-analytics.component.ts:8:26:
      8 │   imports: [CommonModule, LoadingComponent],
        ╵                           ~~~~~~~~~~~~~~~~


▲ [WARNING] NG8113: LoadingComponent is not used within the template of CourseManagementComponent [plugin angular-compiler]

    src/app/features/admin/presentation/components/course-management.component.ts:10:53:       
      10 │ ...orts: [CommonModule, RouterModule, FormsModule, LoadingComponent],
         ╵                                                    ~~~~~~~~~~~~~~~~


▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/admin/presentation/components/course-management.component.ts:229:38:      
      229 │                   @if (course.status?.toUpperCase() === 'PENDING') {
          ╵                                       ~~~~~~~~~~~


▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/admin/presentation/components/course-management.component.ts:238:45:      
      238 │ ...       } @else if (course.status?.toUpperCase() === 'APPROVED') {
          ╵                                      ~~~~~~~~~~~


▲ [WARNING] NG8113: LoadingComponent is not used within the template of SystemSettingsComponent
 [plugin angular-compiler]

    src/app/features/admin/presentation/components/system-settings.component.ts:9:39:
      9 │   imports: [CommonModule, FormsModule, LoadingComponent],
        ╵                                        ~~~~~~~~~~~~~~~~


▲ [WARNING] NG8113: LoadingComponent is not used within the template of MyCoursesComponent [plugin angular-compiler]

    src/app/features/courses/my-courses.component.ts:23:53:
      23 │ ...orts: [CommonModule, RouterModule, FormsModule, LoadingComponent],
         ╵                                                    ~~~~~~~~~~~~~~~~


▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/courses/shared/course-card.component.ts:14:144:
      14 │ ...adow" [attr.aria-label]="'Khóa học: ' + (course?.title || '')">
         ╵                                                  ~~~~~


▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/courses/shared/course-card.component.ts:16:30:
      16 │         <img [ngSrc]="course?.thumbnail || 'assets/images/courses/...
         ╵                               ~~~~~~~~~


▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/courses/shared/course-card.component.ts:16:148:
      16 │ ...�nh ảnh khóa học ' + (course?.title || '')" class="w-full ...
         ╵                            ~~~~~


▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/courses/shared/course-card.component.ts:28:101:
      28 │ ...độ: ' + levelLabelSafe(course?.level)">{{ levelLabelSafe(cou...
         ╵                              ~~~~~


▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/courses/shared/course-card.component.ts:28:135:
      28 │ ...belSafe(course?.level)">{{ levelLabelSafe(course?.level) }}</span>
         ╵                                                 ~~~~~


▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/courses/shared/course-card.component.ts:31:79:
      31 │ ...semibold text-gray-900 mb-2 line-clamp-2">{{ course?.title }}</h3>
         ╵                                                         ~~~~~


▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/courses/shared/course-card.component.ts:32:64:
      32 │ ...-gray-600 text-sm mb-4 line-clamp-2">{{ course?.description }}</p>
         ╵                                                    ~~~~~~~~~~~


▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/courses/shared/course-card.component.ts:35:32:
      35 │ ...     <img [ngSrc]="course?.instructor?.avatar || 'assets/avatar...
         ╵                               ~~~~~~~~~~


▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/courses/shared/course-card.component.ts:35:151:
      35 │ ...�i diện giảng viên ' + (course?.instructor?.name || '')" c...
         ╵                          ~~~~~~~~~~


▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/courses/shared/course-card.component.ts:37:68:
      37 │ ...t-sm font-medium text-gray-900">{{ course?.instructor?.name }}</p>
         ╵                                               ~~~~~~~~~~


▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/courses/shared/course-card.component.ts:38:56:
      38 │ ... class="text-xs text-gray-500">{{ course?.instructor?.title }}</p>
         ╵                                              ~~~~~~~~~~


▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/courses/shared/course-card.component.ts:47:102:
      47 │ ...bel]="'Đánh giá ' + (course?.rating || 0) + ' sao'">{{ cours...
         ╵                              ~~~~~~


▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/courses/shared/course-card.component.ts:47:136:
      47 │ ...á ' + (course?.rating || 0) + ' sao'">{{ course?.rating }}</span>
         ╵                                                  ~~~~~~


▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/courses/shared/course-card.component.ts:48:99:
      48 │ ...ố học viên: ' + (course?.studentsCount || 0)">({{ course?....
         ╵                        ~~~~~~~~~~~~~


▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/courses/shared/course-card.component.ts:48:132:
      48 │ ...(course?.studentsCount || 0)">({{ course?.studentsCount }})</span>
         ╵                                         ~~~~~~~~~~~~~


▲ [WARNING] NG8113: RealVideoPlayerComponent is not used within the template of ProfessionalLearningInterfaceComponent [plugin angular-compiler]

    src/app/features/learning/components/professional-learning-interface.component.ts:64:53:   
      64 │ ...ommonModule, RouterModule, FormsModule, RealVideoPlayerComponent],
         ╵                                            ~~~~~~~~~~~~~~~~~~~~~~~~


▲ [WARNING] NG8113: ProgressBarComponent is not used within the template of StudentDashboardComponent [plugin angular-compiler]

    src/app/features/student/dashboard/student-dashboard.component.ts:64:4:
      64 │     ProgressBarComponent,
         ╵     ~~~~~~~~~~~~~~~~~~~~


▲ [WARNING] NG8113: TabsComponent is not used within the template of StudentDashboardComponent [plugin angular-compiler]

    src/app/features/student/dashboard/student-dashboard.component.ts:65:4:
      65 │     TabsComponent
         ╵     ~~~~~~~~~~~~~


▲ [WARNING] NG8113: CardComponent is not used within the template of StudentMyCoursesComponent [plugin angular-compiler]

    src/app/features/student/student-my-courses.component.ts:51:4:
      51 │     CardComponent,
         ╵     ~~~~~~~~~~~~~


▲ [WARNING] NG8113: ProgressBarComponent is not used within the template of StudentMyCoursesComponent [plugin angular-compiler]

    src/app/features/student/student-my-courses.component.ts:52:4:
      52 │     ProgressBarComponent,
         ╵     ~~~~~~~~~~~~~~~~~~~~


▲ [WARNING] NG8113: TabsComponent is not used within the template of StudentMyCoursesComponent [plugin angular-compiler]

    src/app/features/student/student-my-courses.component.ts:53:4:
      53 │     TabsComponent
         ╵     ~~~~~~~~~~~~~


▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/teacher/assignment-hub/components/speed-grader.component.ts:33:69:        
      33 │ ..."text-sm text-gray-500">{{ currentSubmission()?.studentName }}</p>
         ╵                                                    ~~~~~~~~~~~


▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/teacher/assignment-hub/components/speed-grader.component.ts:51:36:        
      51 │           @if (currentSubmission()?.content) {
         ╵                                     ~~~~~~~


▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/teacher/assignment-hub/components/speed-grader.component.ts:55:40:        
      55 │                 {{ currentSubmission()?.content }}
         ╵                                         ~~~~~~~


▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/teacher/assignment-hub/components/speed-grader.component.ts:67:36:        
      67 │           @if (currentSubmission()?.attachments?.length) {
         ╵                                     ~~~~~~~~~~~


▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/teacher/assignment-hub/components/speed-grader.component.ts:71:51:        
      71 │ ...  @for (file of currentSubmission()?.attachments; track file.id) {
         ╵                                         ~~~~~~~~~~~


▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/teacher/assignment-hub/components/speed-grader.component.ts:91:92:        
      91 │ ...">{{ getInitials(currentSubmission()?.studentName || '') }}</span>
         ╵                                          ~~~~~~~~~~~


▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/teacher/assignment-hub/components/speed-grader.component.ts:94:63:        
      94 │ ... <p class="font-medium">{{ currentSubmission()?.studentName }}</p>
         ╵                                                    ~~~~~~~~~~~


▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/teacher/assignment-hub/components/speed-grader.component.ts:95:73:        
      95 │ ...text-sm text-gray-500">{{ currentSubmission()?.studentEmail }}</p>
         ╵                                                   ~~~~~~~~~~~~


▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/teacher/assignment-hub/components/speed-grader.component.ts:98:38:        
      98 │             @if (currentSubmission()?.isLate) {
         ╵                                       ~~~~~~


▲ [WARNING] NG8107: The left side of this optional chain operation does not include 'null' or 'undefined' in its type, therefore the '?.' operator can be replaced with the '.' operator. [plugin angular-compiler]

    src/app/features/teacher/courses/course-editor.component.ts:208:45:
      208 │ ...          {{ student.fullName?.charAt(0)?.toUpperCase() || '?' }}
          ╵                                   ~~~~~~


▲ [WARNING] NG8113: IconComponent is not used within the template of TeacherDashboardComponent [plugin angular-compiler]

    src/app/features/teacher/dashboard/teacher-dashboard.component.ts:35:4:
      35 │     IconComponent,
         ╵     ~~~~~~~~~~~~~


▲ [WARNING] NG8113: ButtonComponent is not used within the template of TeacherDashboardComponent [plugin angular-compiler]

    src/app/features/teacher/dashboard/teacher-dashboard.component.ts:36:4:
      36 │     ButtonComponent,
         ╵     ~~~~~~~~~~~~~~~


▲ [WARNING] NG8113: CardComponent is not used within the template of TeacherDashboardComponent [plugin angular-compiler]

    src/app/features/teacher/dashboard/teacher-dashboard.component.ts:37:4:
      37 │     CardComponent,
         ╵     ~~~~~~~~~~~~~


▲ [WARNING] NG8113: ProgressBarComponent is not used within the template of TeacherDashboardComponent [plugin angular-compiler]

    src/app/features/teacher/dashboard/teacher-dashboard.component.ts:38:4:
      38 │     ProgressBarComponent,
         ╵     ~~~~~~~~~~~~~~~~~~~~


▲ [WARNING] NG8113: BadgeComponent is not used within the template of TeacherDashboardComponent
 [plugin angular-compiler]

    src/app/features/teacher/dashboard/teacher-dashboard.component.ts:39:4:
      39 │     BadgeComponent
         ╵     ~~~~~~~~~~~~~~


▲ [WARNING] Deprecation [plugin angular-sass]

    src/app/features/student/dashboard/student-dashboard.component.scss:1:8:
      1 │ @import '../../../../styles/variables';
        ╵         ^


  Sass @import rules are deprecated and will be removed in Dart Sass 3.0.0.

  More info and automated migrator: https://sass-lang.com/d/import


▲ [WARNING] Deprecation [plugin angular-sass]

    src/app/features/student/student-my-courses.component.ts:2:12:
      2 │     @import '../../../styles/variables';
        ╵             ^


  Sass @import rules are deprecated and will be removed in Dart Sass 3.0.0.

  More info and automated migrator: https://sass-lang.com/d/import


▲ [WARNING] Deprecation [plugin angular-sass]

    src/app/features/teacher/courses/components/course-students-list.component.scss:1:8:       
      1 │ @import '../../../../../styles/variables';
        ╵         ^


  Sass @import rules are deprecated and will be removed in Dart Sass 3.0.0.

  More info and automated migrator: https://sass-lang.com/d/import


▲ [WARNING] Deprecation [plugin angular-sass]

    src/app/shared/components/ui/badge/badge.component.ts:2:12:
      2 │     @import '../../../../../styles/variables';
        ╵             ^


  Sass @import rules are deprecated and will be removed in Dart Sass 3.0.0.

  More info and automated migrator: https://sass-lang.com/d/import


▲ [WARNING] Deprecation [plugin angular-sass]

    src/app/shared/components/ui/button/button.component.ts:2:12:
      2 │     @import '../../../../../styles/variables';
        ╵             ^


  Sass @import rules are deprecated and will be removed in Dart Sass 3.0.0.

  More info and automated migrator: https://sass-lang.com/d/import


▲ [WARNING] Deprecation [plugin angular-sass]

    src/app/shared/components/ui/card/card.component.ts:2:12:
      2 │     @import '../../../../../styles/variables';
        ╵             ^


  Sass @import rules are deprecated and will be removed in Dart Sass 3.0.0.

  More info and automated migrator: https://sass-lang.com/d/import


▲ [WARNING] Deprecation [plugin angular-sass]

    src/app/shared/components/ui/icon/icon.component.ts:2:12:
      2 │     @import '../../../../../styles/variables';
        ╵             ^


  Sass @import rules are deprecated and will be removed in Dart Sass 3.0.0.

  More info and automated migrator: https://sass-lang.com/d/import


▲ [WARNING] Deprecation [plugin angular-sass]

    src/app/shared/components/ui/loading-spinner/loading-spinner.component.ts:2:12:
      2 │     @import '../../../../../styles/variables';
        ╵             ^


  Sass @import rules are deprecated and will be removed in Dart Sass 3.0.0.

  More info and automated migrator: https://sass-lang.com/d/import


▲ [WARNING] Deprecation [plugin angular-sass]

    src/app/shared/components/ui/progress-bar/progress-bar.component.ts:2:12:
      2 │     @import '../../../../../styles/variables';
        ╵             ^


  Sass @import rules are deprecated and will be removed in Dart Sass 3.0.0.

  More info and automated migrator: https://sass-lang.com/d/import


▲ [WARNING] Deprecation [plugin angular-sass]

    src/app/shared/components/ui/tabs/tabs.component.ts:2:12:
      2 │     @import '../../../../../styles/variables';
        ╵             ^


  Sass @import rules are deprecated and will be removed in Dart Sass 3.0.0.

  More info and automated migrator: https://sass-lang.com/d/import


▲ [WARNING] Deprecation [plugin angular-sass]

    src/styles.scss:6:8:
      6 │ @import 'styles/variables';
        ╵         ^


  Sass @import rules are deprecated and will be removed in Dart Sass 3.0.0.

  More info and automated migrator: https://sass-lang.com/d/import

  The plugin "angular-sass" was triggered by this import

    angular:styles/global:styles:2:8:
      2 │ @import 'src/styles.scss';
        ╵         ~~~~~~~~~~~~~~~~~


Watch mode enabled. Watching for file changes...
NOTE: Raw file sizes do not reflect development server per-request transformations.
  ➜  Local:   http://localhost:4200/
  ➜  press h + enter to show help