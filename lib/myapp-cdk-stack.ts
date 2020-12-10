import sfn = require('@aws-cdk/aws-stepfunctions');
import tasks = require('@aws-cdk/aws-stepfunctions-tasks');
import cdk = require('@aws-cdk/core');
import s3 = require('@aws-cdk/aws-s3');
import lambda = require('@aws-cdk/aws-lambda');
import event_sources = require('@aws-cdk/aws-lambda-event-sources');
import iam = require('@aws-cdk/aws-iam');
import { Duration } from '@aws-cdk/core';

//CDK PermissionsBoundary
export class PermissionsBoundary implements cdk.IAspect {
  private readonly permissionsBoundaryArn: string;
  constructor(permissionBoundaryArn: string) {
    this.permissionsBoundaryArn = permissionBoundaryArn;
  }
  public visit(node: cdk.IConstruct): void {
    if (cdk.CfnResource.isCfnResource(node) && node.cfnResourceType === 'AWS::IAM::Role') {
      node.addPropertyOverride('PermissionsBoundary', this.permissionsBoundaryArn);
    }
  }
}

// BEGIN TODO:1 Replace Cell Phone Number Below
const cellPhone = "+6586550370"
// END TODO:1

export class MyappCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

   // Add a permission boundary to all IAM roles created by CDK

    // BEGIN TODO:2
    const permissionsBoundaryArn = 'arn:aws:iam::538341180297:policy/boundaryMyappRoleRestrictions';
    // END TODO:2
    this.node.applyAspect(new PermissionsBoundary(permissionsBoundaryArn));

    // Pre-built roles to be used by Lambda functions.
    const rekognitionRole = iam.Role.fromRoleArn(this, 'Role', 'arn:aws:iam::${Token[AWS::AccountId.0]}:role/rekognitionRole', {
    mutable: false,
    });

    const s3FunctionRole = iam.Role.fromRoleArn(this, 'Role-1', 'arn:aws:iam::${Token[AWS::AccountId.0]}:role/s3FunctionServiceRole', {
    mutable: false,
    });

    const stateMachineRole = iam.Role.fromRoleArn(this, 'Role-2', 'arn:aws:iam::${Token[AWS::AccountId.0]}:role/StateMachineRole', {
    mutable: false,
    });

    const s3ImageServiceRole = iam.Role.fromRoleArn(this, 'Role-3', 'arn:aws:iam::${Token[AWS::AccountId.0]}:role/s3ImageServiceRole', {
    mutable: false,
    });

    //END Pre-built Roles

    const rekFn = new lambda.Function(this, 'rekognitionFunction', {
      code: lambda.AssetCode.asset('rekognitionlambda'),
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: 'index.handler',
      role: rekognitionRole
    })



    const humanFn = new lambda.Function(this, 'humanFunction', {
      code: lambda.AssetCode.asset('humanlambda'),
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: 'index.handler',
      //Same permissions as the s3ImageServiceRole so no need to create another role.
      role: s3ImageServiceRole,
      environment: {
        "PHONE_NUMBER": cellPhone
      },
    })

    const processObject = new sfn.Task(this, 'Process Image', {
        task: new tasks.InvokeFunction(rekFn)});

    const success = new sfn.Succeed(this, 'We succeeded! Yay!');

    const processHuman = new sfn.Task(this, 'Process Human', {
      task: new tasks.InvokeFunction(humanFn)});

    processHuman.next(success);

    const processOther = new sfn.Pass(this, 'Other Processing');

    processOther.next(success);

    const checkHuman = new sfn.Choice(this, 'Human Found?');
    checkHuman.when(sfn.Condition.stringEquals('$.found', 'human'), processHuman);
    checkHuman.when(sfn.Condition.stringEquals('$.found', 'other'), processOther);

    const definition = processObject
    .next(checkHuman)

    const stm = new sfn.StateMachine(this, 'StateMachine', {
        definition,
        timeout: Duration.seconds(300),
        role: stateMachineRole
    });

    const mybucket = "input-bucket"
    const bucket = new s3.Bucket(this, mybucket)

    const stmArn = stm.stateMachineArn

    const s3Fn = new lambda.Function(this, 's3Function', {
      code: lambda.AssetCode.asset('s3lambda'),
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: 'index.handler',
      role: s3FunctionRole,
      environment: {
        "STEP_ARN": stmArn
      },
    })

    const s3Image = new lambda.Function(this, 's3Image', {
      code: lambda.AssetCode.asset('s3handler-1.0.0.jar'),
      runtime: lambda.Runtime.JAVA_8,
      handler: 'microservices.lambda.s3handler.LambdaFunctionHandler',
      role: s3ImageServiceRole,
      environment: {
        "STEP_ARN": stmArn
      },
    })

    const mybucket1 = "processing-bucket"
    const bucket1 = new s3.Bucket(this, mybucket1)

    s3Image.addEventSource(new event_sources.S3EventSource(bucket1, { events: [ s3.EventType.OBJECT_CREATED ],
      }));

    s3Fn.addEventSource(new event_sources.S3EventSource(bucket, { events: [ s3.EventType.OBJECT_CREATED ],
      }));

    s3Fn.addToRolePolicy(new iam.PolicyStatement({
      resources: [stmArn],
      actions: ['states:StartExecution'],
      }));
  }
}