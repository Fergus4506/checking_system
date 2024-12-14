import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  GetCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});

const dynamo = DynamoDBDocumentClient.from(client);

export const handler = async (event,context) => {
    let body;
    let statusCode = 200;
    const headers = {
        'Content-Type': 'application/json',
    };

    try {
        switch (event.routeKey){
            //1.新增課程
            case 'POST /add-course/{id}':
                let add_file = JSON.parse(event.body);
                await dynamo.send(
                    new PutCommand({
                        TableName: "Course",
                        Item: {
                            name: add_file.name,
                            description: add_file.description,
                            admin_id: event.pathParameters.id,
                        },
                    })
                );
                body = JSON.stringify({ message: `Course added successfully: ${id}` });
                break;
            //2.獲取該使用者的所有課程
            case 'GET /add-course/{id}':
                const {id} = event.pathParameters;
                const admin_course = await dynamo.send(
                    new QueryCommand({
                        TableName: "Course",
                        KeyConditionExpression: "admin_id = :admin_id",
                        ExpressionAttributeValues: {
                            ":admin_id": id,
                        },
                    })
                );
                if(admin_course.Items.length == 0){
                    body = JSON.stringify({ message: `Course not found: ${id}` });
                    break;
                }
                const admin_course_register = await dynamo.send(
                    new QueryCommand({
                        TableName: "Participant",
                        KeyConditionExpression: "course_id = :course_id",
                        ExpressionAttributeValues: {
                            ":course_id": admin_course.Items[0].id,
                        },
                    })
                );
                body = JSON.stringify({ admin_course ,admin_course_register });
                break;
            //3.註冊課程
            case 'POST /register':
                let register_file = JSON.parse(event.body);
                await dynamo.send(
                    new PutCommand({
                        TableName: "Participant",
                        Item: {
                            course_id: register_file.course_id,
                            username: register_file.username,
                            phone: register_file.phone,
                        },
                    })
                );
                body = JSON.stringify({ message: `User registered successfully: ${register_file.username}` });
                break;
            //4.簽到
            case 'POST /check':
                let check_file = JSON.parse(event.body);
                const participant_check = await dynamo.send(
                    new QueryCommand({
                        TableName: "Participant",
                        KeyConditionExpression: "course_id = :course_id AND username = :username",
                        ExpressionAttributeValues: {
                            ":course_id": check_file.course_id,
                            ":username": check_file.username,
                        },
                    })
                );
                //確認是否有此使用者
                if(participant_check.Items.length == 0){
                    body = JSON.stringify({ message: `User not found: ${check_file.username}` });
                    break;
                }
                const course_date_check = await dynamo.send(
                    new QueryCommand({
                        TableName: "CourseDate",
                        KeyConditionExpression: "course_id = :course_id AND date = :date",
                        ExpressionAttributeValues: {
                            ":course_id": check_file.course_id,
                            ":date": check_file.date,
                        },
                    })
                );
                //確認是否有此課程
                if(course_date_check.Items.length == 0){
                    body = JSON.stringify({ message: `Course not found: ${check_file.course_id}` });
                    break;
                }
                const alreadySignedIn = await dynamo.send(
                    new QueryCommand({
                        TableName: "SignInSheet",
                        KeyConditionExpression: "course_date_id = :course_id AND username = :username",
                        ExpressionAttributeValues: {
                            ":course_date_id": course_date_check.Items[0].id,
                            ":username": check_file.username,
                        },
                    })
                );
                //確認是否已經簽到
                if(alreadySignedIn.Items.length != 0){
                    body = JSON.stringify({ message: `Already signed in: ${check_file.username}` });
                    break;
                }
                await dynamo.send(
                    new PutCommand({
                        TableName: "SignInSheet",
                        Item: {
                            course_date_id: course_date_check.Items[0].id,
                            username: check_file.username,
                            check_time: check_file.check_time,
                        },
                    })
                );
                body = JSON.stringify({ message: `Sign in successfully: ${check_file.username}` });
                break;
            //5.查詢課程日期
            case 'POST /add-course-date':
                let add_course_date_file = JSON.parse(event.body);
                const check_course = await dynamo.send(
                    new QueryCommand({
                        TableName: "Course",
                        KeyConditionExpression: "course_id = :id",
                        ExpressionAttributeValues: {
                            ":id": add_course_date_file.course_id,
                        },
                    })
                );
                //確認是否有此課程
                if(check_course.Items.length == 0){
                    body = JSON.stringify({ message: `Course not found: ${add_course_date_file.course_id}` });
                    break;
                }
                const existingDate = await dynamo.send(
                    new QueryCommand({
                        TableName: "CourseDate",
                        KeyConditionExpression: "course_id = :course_id AND date = :date",
                        ExpressionAttributeValues: {
                            ":course_id": add_course_date_file.course_id,
                            ":date": add_course_date_file.date,
                        },
                    })
                );
                //確認是否已有此日期
                if(existingDate.Items.length != 0){
                    body = JSON.stringify({ message: `Date already exists: ${add_course_date_file.date}` });
                    break;
                }
                await dynamo.send(
                    new PutCommand({
                        TableName: "CourseDate",
                        Item: {
                            course_id: add_course_date_file.course_id,
                            date: add_course_date_file.date,
                        },
                    })
                );
                body = JSON.stringify({ message: `Date added successfully: ${add_course_date_file.date}` });
                break;
            //6.修改課程日期
            case 'POST /edit-course-date':
                let edit_course_date_file = JSON.parse(event.body);
                const check_course_edit = await dynamo.send(
                    new QueryCommand({
                        TableName: "Course",
                        KeyConditionExpression: "course_id = :id",
                        ExpressionAttributeValues: {
                            ":id": edit_course_date_file.course_id,
                        },
                    })
                );
                //確認是否有此課程
                if(check_course_edit.Items.length == 0){
                    body = JSON.stringify({ message: `Course not found: ${edit_course_date_file.course_id}` });
                    break;
                }
                const check_course_date = await dynamo.send(
                    new QueryCommand({
                        TableName: "CourseDate",
                        KeyConditionExpression: "course_id = :course_id AND date = :date",
                        ExpressionAttributeValues: {
                            ":course_id": edit_course_date_file.course_id,
                            ":date": edit_course_date_file.date,
                        },
                    })
                );
                //確認是否有此日期
                if(check_course_date.Items.length == 0){
                    body = JSON.stringify({ message: `Date not found: ${edit_course_date_file.date}` });
                    break;
                }
                await dynamo.send(
                    new UpdateCommand({
                        TableName: "CourseDate",
                        Key: {
                            course_id: edit_course_date_file.course_id,
                            date: edit_course_date_file.date,
                        },
                        UpdateExpression: `SET ${edit_course_date_file.check_time}`,
                    })
                );
                body = JSON.stringify({ message: `Date edited successfully: ${edit_course_date_file.date}` });
                break;
            //7.刪除課程日期
            case 'POST /delete-course-date':
                let delete_course_date_file = JSON.parse(event.body);
                const check_course_delete = await dynamo.send(
                    new QueryCommand({
                        TableName: "Course",
                        KeyConditionExpression: "course_id = :id",
                        ExpressionAttributeValues: {
                            ":id": delete_course_date_file.course_id,
                        },
                    })
                );
                //確認是否有此課程
                if(check_course_delete.Items.length == 0){
                    body = JSON.stringify({ message: `Course not found: ${delete_course_date_file.course_id}` });
                    break;
                }
                const check_date_delete = await dynamo.send(
                    new QueryCommand({
                        TableName: "CourseDate",
                        KeyConditionExpression: "course_id = :course_id AND date = :date",
                        ExpressionAttributeValues: {
                            ":course_id": delete_course_date_file.course_id,
                            ":date": delete_course_date_file.date,
                        },
                    })
                );
                //確認是否有此日期
                if(check_date_delete.Items.length == 0){
                    body = JSON.stringify({ message: `Date not found: ${delete_course_date_file.date}` });
                    break;
                }
                await dynamo.send(
                    new DeleteCommand({
                        TableName: "CourseDate",
                        Key: {
                            course_id: delete_course_date_file.course_id,
                            date: delete_course_date_file.date,
                        },
                    })
                );
                body = JSON.stringify({ message: `Date deleted successfully: ${delete_course_date_file.date}` });
                break;
            //8.管理者登入
            case 'POST /admin/login':
                let login_file = JSON.parse(event.body);
                const admin = await dynamo.send(
                    new QueryCommand({
                        TableName: "Admin",
                        KeyConditionExpression: "username = :username",
                        ExpressionAttributeValues: {
                            ":username": login_file.username,
                        },
                    })
                );
                if(admin.Items.length == 0 || admin.Items[0].password != login_file.password){
                    body = JSON.stringify({ message: `Login failed: ${login_file.username}` });
                    break;
                }
                body = JSON.stringify({ message: `Login successfully: ${login_file.username}` });
                break;
            //9.管理者註冊
            case 'POST /admin/register':
                let register_admin_file = JSON.parse(event.body);
                const existingAdmin = await dynamo.send(
                    new QueryCommand({
                        TableName: "Admin",
                        KeyConditionExpression: "username = :username",
                        ExpressionAttributeValues: {
                            ":username": register_admin_file.username,
                        },
                    })
                );
                if(existingAdmin.Items.length != 0){
                    body = JSON.stringify({ message: `Admin already exists: ${register_admin_file.username}` });
                    break;
                }
                await dynamo.send(
                    new PutCommand({
                        TableName: "Admin",
                        Item: {
                            username: register_admin_file.username,
                            password: register_admin_file.password,
                        },
                    })
                );
                body = JSON.stringify({ message: `Admin registered successfully: ${register_admin_file.username}` });
                break;
            //10.獲取課程日期
            case 'GET /course/{id}':
                const courseId = parseInt(event.pathParameters.id, 10);
                const course_file= await dynamo.send(
                    new QueryCommand({
                        TableName: "Course",
                        KeyConditionExpression: "id = :id",
                        ExpressionAttributeValues: {
                            ":id": courseId,
                        },
                    })
                );
                if (course) {
                    body = JSON.stringify({ course });
                } else {
                    statusCode = 404;
                    body = JSON.stringify({ message: 'Course not found' });
                }
                break;
            default:
                throw new Error(`Unsupported route: "${event.routeKey}"`);

        }
    } catch (error) {
        console.error('操作失敗：', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: '操作失敗', error: error.message }),
        };
    }
    return { statusCode, body, headers };
};
