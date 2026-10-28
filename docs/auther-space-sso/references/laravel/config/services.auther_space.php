<?php

// Merge this entry into the array returned by config/services.php.
return [
    'auther_space' => [
        'base_url' => env('AUTHER_SPACE_URL'),
        'client_id' => env('AUTHER_SPACE_CLIENT_ID'),
        'client_secret' => env('AUTHER_SPACE_CLIENT_SECRET'),
        'redirect' => env('AUTHER_SPACE_REDIRECT_URI'),
        'post_logout_redirect' => env('AUTHER_SPACE_POST_LOGOUT_REDIRECT_URI'),
    ],
];
