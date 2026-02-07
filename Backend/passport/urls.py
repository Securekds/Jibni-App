from django.urls import path


from .views import (
    CustomTokenRefreshView,
    SendOTPView,
    UserStatusView,
    VerifyOTPView,
    LogoutView,
    become_server_view,
    ServerUpgradeStatusView,
)

urlpatterns = [
    # 🔐 Authentication
    path("send-otp/", SendOTPView.as_view(), name="send_otp"),
    path("verify-otp/", VerifyOTPView.as_view(), name="verify_otp"),
    path("token/refresh/", CustomTokenRefreshView().as_view(), name="token_refresh"),
    path("token/logout/", LogoutView.as_view(), name="logout"),
    # 🚗 Upgrade to Server
    path("profile/become-server/", become_server_view, name="become-server"),
    path(
        "server-upgrade/status/",
        ServerUpgradeStatusView.as_view(),
        name="server_upgrade_status",
    ),
    path("user-status/", UserStatusView.as_view(), name="user_status"),
    ]
