Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  resources :nutritionists, only: :index do
    resources :appointment_requests, only: :index
    resources :busy_slots, only: :index
  end

  resources :cities, only: :index

  resources :appointment_requests, only: :create do
    member do
      patch :accept
      patch :reject
    end
  end
end
