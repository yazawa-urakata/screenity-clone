import React from "react";

interface LoginPromptProps {
  onLoginClick: () => void;
}

/**
 * 初回ユーザー向けログインプロンプト
 *
 * LoggedOut コンポーネントと同じデザイン
 */
const LoginPrompt: React.FC<LoginPromptProps> = ({
  onLoginClick,
}) => {
  return (
    <div
      className="announcement"
      style={{ marginTop: "50px", paddingBottom: "0px" }}
    >
      <div className="announcement-wrap">
        <div className="announcement-details">
          {/* タイトル */}
          <div className="welcome-title" style={{ marginBottom: "10px" }}>
            ようこそ
          </div>

          {/* ログインボタン */}
          <div
            className="welcome-cta"
            style={{
              marginBottom: "20px",
              backgroundColor: "#29292F",
              boxSizing: "border-box",
              color: "white",
              height: "45px",
              width: "100%",
              borderRadius: "999px",
              textAlign: "center",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
            }}
            onClick={onLoginClick}
          >
            ログイン
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPrompt;
