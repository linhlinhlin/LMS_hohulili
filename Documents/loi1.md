assignment-creation.component.ts:427 
 POST http://localhost:8088/api/v1/courses/550e8400-e29b-41d4-a716-446655440003/assignments 400 (Bad Request)

installHook.js:1 Chỉ có thể tạo bài tập cho khóa học ở trạng thái bản nháp hoặc bị từ chối
installHook.js:1 API Error: 
_HttpErrorResponse {headers: HttpHeaders, status: 400, statusText: 'Unknown Error', url: 'http://localhost:8088/api/v1/courses/550e8400-e29b-41d4-a716-446655440003/assignments', ok: false, …}
auth.interceptor.ts:84 🔗 AuthInterceptor: Error response status: undefined
installHook.js:1 [HTTP] ApiClient.postWithResponse error: http://localhost:8088/api/v1/courses/550e8400-e29b-41d4-a716-446655440003/assignments error: Error: Chỉ có thể tạo bài tập cho khóa học ở trạng thái bản nháp hoặc bị từ chối
    at error.interceptor.ts:64:31
installHook.js:1 API Error: Error: Chỉ có thể tạo bài tập cho khóa học ở trạng thái bản nháp hoặc bị từ chối
    at error.interceptor.ts:64:31
installHook.js:1 Error creating assignment: Error: Server Error: undefined - Chỉ có thể tạo bài tập cho khóa học ở trạng thái bản nháp hoặc bị từ chối
    at api-client.ts:142:29
