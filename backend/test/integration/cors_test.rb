require "test_helper"

class CorsTest < ActionDispatch::IntegrationTest
  FRONTEND = "http://localhost:5173".freeze

  test "a request from the frontend origin gets the CORS header" do
    get nutritionists_url, headers: { "Origin" => FRONTEND }

    assert_response :success
    assert_equal FRONTEND, response.headers["Access-Control-Allow-Origin"]
  end

  test "a request from another origin does not" do
    get nutritionists_url, headers: { "Origin" => "http://evil.example" }

    assert_nil response.headers["Access-Control-Allow-Origin"]
  end

  test "the preflight for a JSON POST is allowed" do
    options appointment_requests_url, headers: {
      "Origin" => FRONTEND,
      "Access-Control-Request-Method" => "POST",
      "Access-Control-Request-Headers" => "content-type"
    }

    assert_response :success
    assert_equal FRONTEND, response.headers["Access-Control-Allow-Origin"]
    assert_includes response.headers["Access-Control-Allow-Methods"], "POST"
  end

  test "the preflight for PATCH (accept / reject) is allowed" do
    options accept_appointment_request_url(id: 1), headers: {
      "Origin" => FRONTEND,
      "Access-Control-Request-Method" => "PATCH"
    }

    assert_response :success
    assert_includes response.headers["Access-Control-Allow-Methods"], "PATCH"
  end
end
