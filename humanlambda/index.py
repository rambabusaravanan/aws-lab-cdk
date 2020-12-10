# Notify on detection of human image
#

from __future__ import print_function
import boto3
import os

def handler(event, context):

    phoneNumber = os.environ['PHONE_NUMBER']
    smsMessage = "We found a human!"

    print('Initiating image rekognition')

    found = event['found']

    if found == 'human':

        sns_client = boto3.client('sns')
        
        sms = sns_client.publish(
            PhoneNumber = phoneNumber, 
            Message= smsMessage,
        )
    else:
        raise Exception('No human detected')

    return