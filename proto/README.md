# Proto Files
Proto files can be added to the **proto/** directory so that the AllProxy tool can decode the binary data, and make it readable.  AllProxy currently only supports GRPC URLs of the
form **/<package>/<service>.<func>** (e.g., /mypackage/mMService/MyFunc).

The AllProxy is configured to proxy gRPC requests to a microservice:
![image](https://user-images.githubusercontent.com/10223382/169716774-50a36b6a-5503-46af-b119-b718278db0a6.png)