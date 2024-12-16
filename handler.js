import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});

const dynamo = DynamoDBDocumentClient.from(client);

let Course_id_counter = 0;
let CourseDate_id_counter = 0;
let Participant_id_counter = 0;
let SignInSheet_id_counter = 0;
let Admin_id_counter = 0;

export const handler = async (event,context) => {
    let body;
    let statusCode = 200;
    const headers = {
        'Content-Type': 'application/json',
    };

    try {
        switch (event.routeKey){
            //1.新增課程
            case 'POST /Course/{id}':
                let add_file = JSON.parse(event.body);
                await dynamo.send(
                    new PutCommand({
                        TableName: "Course",
                        Item: {
                            course_id: Course_id_counter++,
                            name: add_file.name,
                            description: add_file.description,
                            admin_id: parseInt(event.pathParameters.id, 10),
                        },
                    })
                );
                body = JSON.stringify({ message: `Course added successfully: ` });
                break;
            //2.獲取指定課程
            case 'GET /Course/{id}':
                //id要是數字
                const id = parseInt(event.pathParameters.id, 10);
                const course_sl = await dynamo.send(
                    new GetCommand({
                        TableName: "Course",
                        Key:{
                            course_id: id,
                        },
                    })
                );
                body = JSON.stringify({ course_sl });
                break;
            //3.獲取指定管理者的所有課程
            case 'GET /Course/admin/{id}':
                const admin_course = await dynamo.send(
                    new QueryCommand({
                        TableName: "Course",
                        KeyConditionExpression: "admin_id = :admin_id",
                        ExpressionAttributeValues: {
                            ":admin_id": parseInt(event.pathParameters.id, 10),
                        },
                    })
                );
                body = JSON.stringify({ admin_course });
                break;
            //4.修改課程
            case 'POST /Course/edit/{id}':
                let course_edit_file = JSON.parse(event.body);
                await dynamo.send(
                    new UpdateCommand({
                        TableName: "Course",
                        Key: {
                            course_id:parseInt(event.pathParameters.id, 10),
                        },
                        UpdateExpression: "SET #name = :name, #description = :description",
                        ExpressionAttributeNames: {
                            "#name": "name",
                            "#description": "description",
                        },
                        ExpressionAttributeValues: {
                            ":name": course_edit_file.name,
                            ":description": course_edit_file.description,
                        },
                    })
                );
                body = JSON.stringify({ message: `Course edited successfully: ` });
                break;
            //5.刪除課程
            case 'POST /Course/delete/{id}':
                await dynamo.send(
                    new DeleteCommand({
                        TableName: "Course",
                        Key: {
                            course_id: parseInt(event.pathParameters.id, 10),
                        },
                    })
                );
                //搜尋課程相對應的課程日期
                const course_date = await dynamo.send(
                    new QueryCommand({
                        TableName: "CourseDate",
                        KeyConditionExpression: "course_id = :course_id",
                        ExpressionAttributeValues: {
                            ":course_id": parseInt(event.pathParameters.id, 10),
                        },
                    })
                );
                //刪除課程相對應的課程日期
                for(let i = 0; i < course_date.Items.length; i++){
                    //搜尋課程日期相對應的簽到人員
                    const sign_in_sheet = await dynamo.send(
                        new QueryCommand({
                            TableName: "SignInSheet",
                            KeyConditionExpression: "course_date_id = :course_date_id",
                            ExpressionAttributeValues: {
                                ":course_date_id": course_date.Items[i].course_date_id,
                            },
                        })
                    );
                    //刪除課程日期相對應的簽到人員
                    for(let j = 0; j < sign_in_sheet.Items.length; j++){
                        await dynamo.send(
                            new DeleteCommand({
                                TableName: "SignInSheet",
                                Key: {
                                    sign_in_id: sign_in_sheet.Items[j].sign_in_id,
                                },
                            })
                        );
                    }
                    await dynamo.send(
                        new DeleteCommand({
                            TableName: "CourseDate",
                            Key: {
                                course_date_id: course_date.Items[i].course_date_id,
                            },
                        })
                    );
                }
                await dynamo.send(
                    new DeleteCommand({
                        TableName: "Participant",
                        Key: {
                            course_id: parseInt(event.pathParameters.id, 10),
                        },
                    })
                );
                body = JSON.stringify({ message: `Course deleted successfully: ` });
                break;
            //6.新增管理者
            case 'POST /admin/register':
                let admin_file = JSON.parse(event.body);
                await dynamo.send(
                    new PutCommand({
                        TableName: "Admin",
                        Item: {
                            admin_id: Admin_id_counter++,
                            username: admin_file.username,
                            password: admin_file.password,
                        },
                    })
                );
                body = JSON.stringify({ message: `Admin added successfully: ` });
                break;
            //7.確認管理員資料
            case 'POST /admin/login':
                let admin_login_file = JSON.parse(event.body);
                const login_check = await dynamo.send(
                    new QueryCommand({
                        TableName: "Admin",
                        KeyConditionExpression: "username = :username",
                        ExpressionAttributeValues: {
                            ":username": admin_login_file.username,
                        },
                    })
                );
                if(login_check.Items.length == 0 || login_check.Items[0].password != admin_login_file.password){
                    body = JSON.stringify({ message: `Login failed: ${login_file.username}`,id:login_check.Items[0].admin_id });
                    break;
                }
                body = JSON.stringify({ message: `Login successfully: ${admin_login_file.username}` });
                break;
            //8.新增課程日期
            case 'POST /CourseDate/{id}':
                let add_course_date_file = JSON.parse(event.body);
                await dynamo.send(
                    new PutCommand({
                        TableName: "CourseDate",
                        Item: {
                            course_date_id: CourseDate_id_counter++,
                            course_id: parseInt(event.pathParameters.id, 10),
                            date: add_course_date_file.date,
                        },
                    })
                );
                body = JSON.stringify({ message: `Course date added successfully: ` });
                break;
            //9.獲取指定課程日期
            case 'GET /CourseDate/{id}':
                const course_date_sl = await dynamo.send(
                    new GetCommand({
                        TableName: "CourseDate",
                        Key:{
                            course_date_id: parseInt(event.pathParameters.id, 10),
                        },
                    })
                );
                body = JSON.stringify({ course_date_sl });
                break;
            //10.獲取指定課程的所有日期
            case 'GET /CourseDate/course/{id}':
                const course_course_date = await dynamo.send(
                    new QueryCommand({
                        TableName: "CourseDate",
                        KeyConditionExpression: "course_id = :course_id",
                        ExpressionAttributeValues: {
                            ":course_id": parseInt(event.pathParameters.id, 10),
                        },
                    })
                );
                body = JSON.stringify({ course_course_date });
                break;
            //11.修改課程日期
            case 'POST /CourseDate/edit/{id}':
                let course_date_edit_file = JSON.parse(event.body);
                await dynamo.send(
                    new UpdateCommand({
                        TableName: "CourseDate",
                        Key: {
                            course_date_id: parseInt(event.pathParameters.id, 10),
                        },
                        UpdateExpression: "SET #date = :date",
                        ExpressionAttributeNames: {
                            "#date": "date",
                        },
                        ExpressionAttributeValues: {
                            ":date": course_date_edit_file.date,
                        },
                    })
                );
                body = JSON.stringify({ message: `Course date edited successfully: ` });
                break;
            //12.刪除課程日期
            case 'POST /CourseDate/delete/{id}':
                //搜尋課程日期相對應的簽到人員
                const sign_in_sheet = await dynamo.send(
                    new QueryCommand({
                        TableName: "SignInSheet",
                        KeyConditionExpression: "course_date_id = :course_date_id",
                        ExpressionAttributeValues: {
                            ":course_date_id": parseInt(event.pathParameters.id, 10),
                        },
                    })
                );
                //刪除課程日期相對應的簽到人員
                for(let i = 0; i < sign_in_sheet.Items.length; i++){
                    await dynamo.send(
                        new DeleteCommand({
                            TableName: "SignInSheet",
                            Key: {
                                sign_in_id: sign_in_sheet.Items[i].sign_in_id,
                            },
                        })
                    );
                }
                await dynamo.send(
                    new DeleteCommand({
                        TableName: "CourseDate",
                        Key: {
                            course_date_id: parseInt(event.pathParameters.id, 10),
                        },
                    })
                );
                body = JSON.stringify({ message: `Course date deleted successfully: ` });
                break;
            //13.新增參與者
            case 'POST /Participant/{id}':
                let add_participant_file = JSON.parse(event.body);
                await dynamo.send(
                    new PutCommand({
                        TableName: "Participant",
                        Item: {
                            participant_id: Participant_id_counter++,
                            course_id: parseInt(event.pathParameters.id, 10),
                            username: add_participant_file.name,
                            phone: add_participant_file.phone,
                        },
                    })
                );
                body = JSON.stringify({ message: `Participant added successfully: ` });
                break;
            //14.獲取指定參與者
            case 'GET /Participant/{id}':
                const participant_sl = await dynamo.send(
                    new GetCommand({
                        TableName: "Participant",
                        Key:{
                            participant_id: parseInt(event.pathParameters.id, 10),
                        },
                    })
                );
                body = JSON.stringify({ participant_sl });
                break;
            //15.獲取指定姓名的參與者
            case 'GET /Participant/name/{name}':
                const participant_name = await dynamo.send(
                    new QueryCommand({
                        TableName: "Participant",
                        IndexName: "username-index",
                        KeyConditionExpression: "#username = :username",
                        ExpressionAttributeNames: {
                            "#username": "username",
                        },
                        ExpressionAttributeValues: {
                            ":username": event.pathParameters.username,
                        },
                    })
                );
                body = JSON.stringify({ participant_name });
                break;
            //16.獲取指定課程的所有參與者
            case 'GET /Participant/course/{id}':
                const course_participant = await dynamo.send(
                    new QueryCommand({
                        TableName: "Participant",
                        KeyConditionExpression: "course_id = :course_id",
                        ExpressionAttributeValues: {
                            ":course_id": parseInt(event.pathParameters.id, 10),
                        },
                    })
                );
                body = JSON.stringify({ course_participant });
                break;
            //17.修改參與者
            case 'POST /Participant/edit/{id}':
                let participant_edit_file = JSON.parse(event.body);
                await dynamo.send(
                    new UpdateCommand({
                        TableName: "Participant",
                        Key: {
                            participant_id: event.pathParameters.id,
                        },
                        UpdateExpression: "SET #username = :username, #phone = :phone",
                        ExpressionAttributeNames: {
                            "#username": "username",
                            "#phone": "phone",
                        },
                        ExpressionAttributeValues: {
                            ":username": participant_edit_file.username,
                            ":phone": participant_edit_file.phone,
                        },
                    })
                );
                body = JSON.stringify({ message: `Participant edited successfully: ` });
                break;
            //18.刪除參與者
            case 'POST /Participant/delete/{id}':
                await dynamo.send(
                    new DeleteCommand({
                        TableName: "Participant",
                        Key: {
                            participant_id: parseInt(event.pathParameters.id, 10),
                        },
                    })
                );
                await dynamo.send(
                    new QueryCommand({
                        TableName: "SignInSheet",
                        KeyConditionExpression: "participant_id = :participant_id",
                        ExpressionAttributeValues: {
                            ":participant_id": parseInt(event.pathParameters.id, 10),
                        },
                    })
                );
                //刪除參與者相對應的簽到人員
                for(let i = 0; i < sign_in_sheet.Items.length; i++){
                    await dynamo.send(
                        new DeleteCommand({
                            TableName: "SignInSheet",
                            Key: {
                                sign_in_id: sign_in_sheet.Items[i].sign_in_id,
                            },
                        })
                    );
                }
                body = JSON.stringify({ message: `Participant deleted successfully: ` });
                break;
            //19.新增簽到人員
            case 'POST /checkin/{id}':
                let add_sign_in_sheet_file = JSON.parse(event.body);
                await dynamo.send(
                    new PutCommand({
                        TableName: "SignInSheet",
                        Item: {
                            sign_in_id: SignInSheet_id_counter++,
                            course_date_id: parseInt(event.pathParameters.id, 10),
                            username: add_sign_in_sheet_file.username,
                            check_time: add_sign_in_sheet_file.check_time,

                        },
                    })
                );
                body = JSON.stringify({ message: `Sign in sheet added successfully: ` });
                break;
            //20.獲取指定課程日期的簽到人員
            case 'GET /SignInSheet/CourseDate/{id}':
                const course_date_sign_in = await dynamo.send(
                    new QueryCommand({
                        TableName: "SignInSheet",
                        KeyConditionExpression: "course_date_id = :course_date_id",
                        ExpressionAttributeValues: {
                            ":course_date_id":parseInt(event.pathParameters.id, 10),
                        },
                    })
                );
                body = JSON.stringify({ course_date_sign_in });
                break;
            //21.刪除簽到人員
            case 'POST /SignInSheet/delete/{id}':
                await dynamo.send(
                    new DeleteCommand({
                        TableName: "SignInSheet",
                        Key: {
                            sign_in_id: parseInt(event.pathParameters.id, 10),
                        },
                    })
                );
                body = JSON.stringify({ message: `Sign in sheet deleted successfully: ` });
                break;
            //22.檢查是否有該管理者存在
            case 'GET /admin/{id}':
                const admin_check = await dynamo.send(
                    new GetCommand({
                        TableName: "Admin",
                        Key:{
                            admin_id: parseInt(event.pathParameters.id, 10),
                        },
                    })
                );
                body = JSON.stringify({ admin_check });
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
